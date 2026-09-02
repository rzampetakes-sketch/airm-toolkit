import { Injectable } from "@nestjs/common";
import { MarkupRule as PrismaMarkupRule } from "@prisma/client";
import { PricingContext, UnifiedFlightOffer } from "@travel-platform/types";
import { PrismaService } from "../../common/prisma/prisma.service";

/**
 * Dynamic markup engine. Matches the most specific active MarkupRule for
 * an offer's route/aircraft/cabin/segment and applies it, in priority
 * order (higher priority wins first match). Falls back to a `global`
 * rule if nothing more specific matches, and to zero markup if none
 * exists at all — the platform should never silently sell at a loss due
 * to a missing rule, so pricing ops must seed at least one global rule.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async applyMarkup(offer: UnifiedFlightOffer, context: PricingContext): Promise<UnifiedFlightOffer> {
    const rule = await this.findMatchingRule(context);

    if (!rule) {
      return { ...offer, finalAmount: offer.baseAmount, finalCurrency: offer.baseCurrency };
    }

    const markupAmount = this.calculateMarkupAmount(offer.baseAmount, rule);

    return {
      ...offer,
      markup: {
        ruleId: rule.id,
        type: rule.markupType as "percentage" | "fixed",
        value: Number(rule.markupValue),
        amount: markupAmount,
      },
      finalAmount: Number((offer.baseAmount + markupAmount).toFixed(2)),
      finalCurrency: offer.baseCurrency,
    };
  }

  private calculateMarkupAmount(baseAmount: number, rule: PrismaMarkupRule): number {
    if (rule.markupType === "percentage") {
      return Number(((baseAmount * Number(rule.markupValue)) / 100).toFixed(2));
    }
    return Number(rule.markupValue);
  }

  /**
   * Scope specificity order: route > aircraft_type > cabin_class >
   * customer_segment > global. Within a scope, `priority` (desc) breaks
   * ties so pricing ops can layer overrides (e.g. a temporary promo rule
   * with higher priority than the standing route rule).
   */
  private async findMatchingRule(context: PricingContext): Promise<PrismaMarkupRule | null> {
    const now = new Date();
    const activeRules = await this.prisma.markupRule.findMany({
      where: {
        active: true,
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }],
      },
      orderBy: { priority: "desc" },
    });

    const bySpecificity = (scopeType: PrismaMarkupRule["scopeType"]) =>
      activeRules.find((rule) => rule.scopeType === scopeType && this.matchesScope(rule, context));

    return (
      bySpecificity("route") ??
      bySpecificity("aircraft_type") ??
      bySpecificity("cabin_class") ??
      bySpecificity("customer_segment") ??
      bySpecificity("global") ??
      null
    );
  }

  private matchesScope(rule: PrismaMarkupRule, context: PricingContext): boolean {
    const scopeValue = rule.scopeValue as Record<string, string>;

    switch (rule.scopeType) {
      case "route":
        return (
          scopeValue.origin === context.route.origin &&
          scopeValue.destination === context.route.destination
        );
      case "aircraft_type":
        return scopeValue.aircraftType === context.aircraftType;
      case "cabin_class":
        return scopeValue.cabinClass === context.cabinClass;
      case "customer_segment":
        return scopeValue.customerSegment === context.customerSegment;
      case "global":
        return true;
      default:
        return false;
    }
  }
}
