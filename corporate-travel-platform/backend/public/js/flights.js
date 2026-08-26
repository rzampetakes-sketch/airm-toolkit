import { searchFlights, corporate } from './api.js';
import { attachAutocomplete } from './autocomplete.js';
import { session, isLoggedInClient } from './state.js';
import {
  escapeHtml,
  formatMoney,
  formatDurationMinutes,
  formatClockTime,
  formatDateLabel,
  stopsLabel,
  stopsBadgeClass,
  todayIso,
} from './utils.js';

let rawOffers = [];
let legCounter = 0;
const els = {};

function cacheEls() {
  Object.assign(els, {
    form: document.getElementById('flights-form'),
    tripTypeRadios: document.querySelectorAll('input[name="tripType"]'),
    simpleFields: document.getElementById('simple-trip-fields'),
    multicityFields: document.getElementById('multicity-fields'),
    legsContainer: document.getElementById('legs-container'),
    addLegBtn: document.getElementById('add-leg-btn'),
    originInput: document.getElementById('origin-input'),
    originCode: document.getElementById('origin-code'),
    originSuggestions: document.getElementById('origin-suggestions'),
    destinationInput: document.getElementById('destination-input'),
    destinationCode: document.getElementById('destination-code'),
    destinationSuggestions: document.getElementById('destination-suggestions'),
    swapBtn: document.getElementById('swap-locations-btn'),
    departDate: document.getElementById('depart-date'),
    returnDate: document.getElementById('return-date'),
    returnDateWrapper: document.getElementById('return-date-wrapper'),
    adults: document.getElementById('flights-adults'),
    cabinClass: document.getElementById('cabin-class'),
    filterPanel: document.getElementById('filters-flights'),
    filterStopDirect: document.getElementById('filter-stop-direct'),
    filterStop1: document.getElementById('filter-stop-1'),
    filterStop2plus: document.getElementById('filter-stop-2plus'),
    maxPrice: document.getElementById('filter-flight-max-price'),
    maxPriceValue: document.getElementById('filter-flight-max-price-value'),
    airlinesList: document.getElementById('filter-airlines-list'),
    resetBtn: document.getElementById('reset-flight-filters'),
    quoteModal: document.getElementById('quote-modal'),
    quoteForm: document.getElementById('quote-form'),
    quoteTravelerName: document.getElementById('quote-traveler-name'),
    quoteNotes: document.getElementById('quote-notes'),
    quoteError: document.getElementById('quote-error'),
    quoteCancelBtn: document.getElementById('quote-cancel-btn'),
  });
}

function setMinDates() {
  els.departDate.min = todayIso();
  els.departDate.addEventListener('change', () => {
    els.returnDate.min = els.departDate.value;
  });
}

// ------------------------- Trip type switching -------------------------------

function currentTripType() {
  return document.querySelector('input[name="tripType"]:checked').value;
}

function handleTripTypeChange() {
  els.tripTypeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      const type = currentTripType();
      els.simpleFields.classList.toggle('hidden', type === 'multicity');
      els.multicityFields.classList.toggle('hidden', type !== 'multicity');
      els.returnDateWrapper.classList.toggle('hidden', type !== 'roundtrip');
      els.returnDate.required = type === 'roundtrip';

      if (type === 'multicity' && els.legsContainer.children.length === 0) {
        addLegRow();
        addLegRow();
      }
    });
  });
}

function handleSwap() {
  els.swapBtn.addEventListener('click', () => {
    [els.originInput.value, els.destinationInput.value] = [els.destinationInput.value, els.originInput.value];
    [els.originCode.value, els.destinationCode.value] = [els.destinationCode.value, els.originCode.value];
  });
}

// ------------------------- Multi-city leg rows --------------------------------

function addLegRow() {
  if (els.legsContainer.children.length >= 6) return;
  const id = legCounter++;
  const row = document.createElement('div');
  row.className = 'leg-row grid grid-cols-1 gap-3 rounded-lg border border-navy-600 p-3 md:grid-cols-7';
  row.dataset.legId = String(id);
  row.innerHTML = `
    <div class="relative md:col-span-3">
      <label class="field-label">From</label>
      <input type="text" class="field-input leg-origin-input" autocomplete="off" placeholder="City or airport" required />
      <input type="hidden" class="leg-origin-code" />
      <ul class="autocomplete-list hidden leg-origin-suggestions"></ul>
    </div>
    <div class="relative md:col-span-3">
      <label class="field-label">To</label>
      <input type="text" class="field-input leg-destination-input" autocomplete="off" placeholder="City or airport" required />
      <input type="hidden" class="leg-destination-code" />
      <ul class="autocomplete-list hidden leg-destination-suggestions"></ul>
    </div>
    <div class="flex items-end gap-2 md:col-span-1">
      <div class="flex-1">
        <label class="field-label">Date</label>
        <input type="date" class="field-input leg-date" required />
      </div>
      <button type="button" class="remove-leg-btn mb-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-md border border-navy-600 text-slate-400 hover:border-rose-400 hover:text-rose-300" title="Remove flight">✕</button>
    </div>
  `;
  els.legsContainer.appendChild(row);

  row.querySelector('.leg-date').min = todayIso();

  attachAutocomplete({
    inputEl: row.querySelector('.leg-origin-input'),
    listEl: row.querySelector('.leg-origin-suggestions'),
    codeEl: row.querySelector('.leg-origin-code'),
  });
  attachAutocomplete({
    inputEl: row.querySelector('.leg-destination-input'),
    listEl: row.querySelector('.leg-destination-suggestions'),
    codeEl: row.querySelector('.leg-destination-code'),
  });

  row.querySelector('.remove-leg-btn').addEventListener('click', () => {
    if (els.legsContainer.children.length <= 2) return; // keep at least 2 legs for multi-city
    row.remove();
  });
}

function collectLegs() {
  const type = currentTripType();

  if (type === 'oneway') {
    return [{ origin: els.originCode.value, destination: els.destinationCode.value, date: els.departDate.value }];
  }

  if (type === 'roundtrip') {
    return [
      { origin: els.originCode.value, destination: els.destinationCode.value, date: els.departDate.value },
      { origin: els.destinationCode.value, destination: els.originCode.value, date: els.returnDate.value },
    ];
  }

  // multicity
  return Array.from(els.legsContainer.querySelectorAll('.leg-row')).map((row) => ({
    origin: row.querySelector('.leg-origin-code').value,
    destination: row.querySelector('.leg-destination-code').value,
    date: row.querySelector('.leg-date').value,
  }));
}

function validateLegs(legs) {
  for (const leg of legs) {
    if (!leg.origin || !leg.destination) {
      return 'Please select every origin and destination from the suggestion list.';
    }
    if (!leg.date) {
      return 'Please choose a date for every flight.';
    }
    if (leg.origin === leg.destination) {
      return 'Origin and destination must be different for each flight.';
    }
  }
  return null;
}

// ------------------------- Rendering results -----------------------------------

function buildItineraryHtml(itinerary) {
  return `
    <div class="flex flex-wrap items-center gap-3 text-sm text-slate-300">
      <span class="font-semibold text-white">${escapeHtml(itinerary.origin)} ${formatClockTime(itinerary.departureTime)}</span>
      <span class="text-gold-400">→</span>
      <span class="font-semibold text-white">${escapeHtml(itinerary.destination)} ${formatClockTime(itinerary.arrivalTime)}</span>
      <span class="text-slate-500">·</span>
      <span>${formatDateLabel(itinerary.departureTime)}</span>
      <span class="text-slate-500">·</span>
      <span>${formatDurationMinutes(itinerary.durationMinutes)}</span>
      <span class="stop-badge ${stopsBadgeClass(itinerary.stops)}">${stopsLabel(itinerary.stops)}</span>
    </div>`;
}

function buildOfferCard(offer) {
  const amenitiesHtml = offer.amenities.length
    ? offer.amenities
        .slice(0, 6)
        .map((a) => `<span class="amenity-pill">${a.isChargeable ? '' : '✓ '}${escapeHtml(a.description)}</span>`)
        .join('')
    : '<span class="amenity-pill">Amenity details not published by fare</span>';

  return `
    <article class="result-card" data-offer-id="${escapeHtml(offer.id)}">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-white">${escapeHtml(offer.airlineName)}</span>
          <span class="cabin-badge">${escapeHtml(offer.cabinClass.replace('_', ' '))}</span>
        </div>
        <span class="text-2xl font-bold text-gold-300">${formatMoney(offer.price, offer.currency)}</span>
      </div>

      <div class="space-y-2 border-t border-navy-700 pt-3">
        ${offer.itineraries.map(buildItineraryHtml).join('<div class="border-t border-dashed border-navy-700"></div>')}
      </div>

      <div class="mt-3 flex flex-wrap gap-2 border-t border-navy-700 pt-3">
        <span class="amenity-pill">🧳 ${escapeHtml(offer.baggageAllowance)}</span>
        ${amenitiesHtml}
      </div>

      <div class="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-navy-700 pt-3">
        <button type="button" class="btn-outline-gold request-quote-btn text-sm">Request Quote / Invoice</button>
        <a href="${offer.bookingUrl}" target="_blank" rel="noopener noreferrer" class="btn-gold book-now-link text-sm">Book Now</a>
      </div>
    </article>`;
}

function bestValueScore(offer) {
  return offer.price + offer.totalDurationMinutes * 0.5 + offer.totalStops * 30;
}

function getCheckedAirlineCodes() {
  return Array.from(els.airlinesList.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
}

function applyFiltersAndSort() {
  const showDirect = els.filterStopDirect.checked;
  const show1 = els.filterStop1.checked;
  const show2plus = els.filterStop2plus.checked;
  const maxPrice = Number(els.maxPrice.value);
  const checkedAirlines = new Set(getCheckedAirlineCodes());

  let filtered = rawOffers.filter((offer) => {
    const stops = offer.itineraries[0]?.stops ?? 0;
    if (stops === 0 && !showDirect) return false;
    if (stops === 1 && !show1) return false;
    if (stops >= 2 && !show2plus) return false;
    if (offer.price > maxPrice) return false;
    if (checkedAirlines.size > 0 && !checkedAirlines.has(offer.airlineCode)) return false;
    return true;
  });

  const sortKey = document.getElementById('sort-select').value;
  if (sortKey === 'price-asc') {
    filtered = filtered.sort((a, b) => a.price - b.price);
  } else if (sortKey === 'duration-asc') {
    filtered = filtered.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
  } else {
    filtered = filtered.sort((a, b) => bestValueScore(a) - bestValueScore(b));
  }

  renderResults(filtered);
}

function renderResults(offers) {
  const list = document.getElementById('results-list');
  const emptyState = document.getElementById('empty-state');
  document.getElementById('results-heading').textContent =
    rawOffers.length > 0 ? `${offers.length} of ${rawOffers.length} premium fares` : 'No availability found';

  if (offers.length === 0) {
    list.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  list.innerHTML = offers.map(buildOfferCard).join('');

  list.querySelectorAll('.book-now-link').forEach((link) => {
    link.addEventListener('click', () => {
      const offerId = link.closest('[data-offer-id]').dataset.offerId;
      logBookingIfCorporate(offers.find((o) => o.id === offerId));
    });
  });
  list.querySelectorAll('.request-quote-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const offerId = btn.closest('[data-offer-id]').dataset.offerId;
      openQuoteModal(offers.find((o) => o.id === offerId));
    });
  });
}

function populateAirlineFilters(offers) {
  const uniqueAirlines = new Map();
  offers.forEach((offer) => uniqueAirlines.set(offer.airlineCode, offer.airlineName));

  els.airlinesList.innerHTML = Array.from(uniqueAirlines.entries())
    .map(
      ([code, name]) => `
      <label class="checkbox-row">
        <input type="checkbox" value="${escapeHtml(code)}" checked class="rounded text-gold-400 airline-filter-checkbox" />
        ${escapeHtml(name)}
      </label>`
    )
    .join('');

  els.airlinesList.querySelectorAll('.airline-filter-checkbox').forEach((cb) => {
    cb.addEventListener('change', applyFiltersAndSort);
  });
}

function populatePriceSlider(offers) {
  const prices = offers.map((o) => o.price);
  const min = Math.floor(Math.min(...prices));
  const max = Math.ceil(Math.max(...prices));
  els.maxPrice.min = min;
  els.maxPrice.max = max;
  els.maxPrice.value = max;
  els.maxPrice.step = Math.max(1, Math.round((max - min) / 50));
  els.maxPriceValue.textContent = formatMoney(max);
}

function resetFilterInputs() {
  els.filterStopDirect.checked = true;
  els.filterStop1.checked = true;
  els.filterStop2plus.checked = true;
  els.airlinesList.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = true));
  if (rawOffers.length > 0) populatePriceSlider(rawOffers);
}

function showSkeletons() {
  const container = document.getElementById('skeleton-container');
  container.innerHTML = Array.from({ length: 4 })
    .map(
      () => `
      <div class="skeleton">
        <div class="mb-3 flex items-center justify-between">
          <div class="skeleton-bar h-4 w-32"></div>
          <div class="skeleton-bar h-7 w-20"></div>
        </div>
        <div class="skeleton-bar h-5 w-2/3"></div>
        <div class="mt-3 skeleton-bar h-4 w-1/2"></div>
      </div>`
    )
    .join('');
  container.classList.remove('hidden');
}

function hideSkeletons() {
  document.getElementById('skeleton-container').classList.add('hidden');
}

function showError(message) {
  const errorEl = document.getElementById('error-state');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  document.getElementById('results-section').classList.remove('hidden');
}

// ------------------------- Corporate integration ------------------------------

function logBookingIfCorporate(offer) {
  if (!offer || !isLoggedInClient()) return;
  const firstLeg = offer.itineraries[0];
  corporate
    .logBooking({
      travelerName: session.user.fullName,
      origin: firstLeg.origin,
      destination: firstLeg.destination,
      cabinClass: offer.cabinClass,
      airlineName: offer.airlineName,
      departDate: firstLeg.departureTime ? firstLeg.departureTime.slice(0, 10) : todayIso(),
      price: offer.price,
      currency: offer.currency,
    })
    .catch(() => {
      // Non-critical: booking still happens on the partner site regardless.
    });
}

let quoteTargetOffer = null;

function openQuoteModal(offer) {
  if (!isLoggedInClient()) {
    window.location.href = '/login.html?next=/';
    return;
  }
  quoteTargetOffer = offer;
  els.quoteTravelerName.value = session.user.fullName;
  els.quoteNotes.value = '';
  els.quoteError.classList.add('hidden');
  els.quoteModal.classList.remove('hidden');
  els.quoteModal.classList.add('flex');
}

function closeQuoteModal() {
  els.quoteModal.classList.add('hidden');
  els.quoteModal.classList.remove('flex');
  quoteTargetOffer = null;
}

function initQuoteModal() {
  els.quoteCancelBtn.addEventListener('click', closeQuoteModal);
  els.quoteModal.addEventListener('click', (event) => {
    if (event.target === els.quoteModal) closeQuoteModal();
  });

  els.quoteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!quoteTargetOffer) return;
    const firstLeg = quoteTargetOffer.itineraries[0];
    try {
      await corporate.requestQuote({
        travelerName: els.quoteTravelerName.value,
        origin: firstLeg.origin,
        destination: firstLeg.destination,
        cabinClass: quoteTargetOffer.cabinClass,
        airlineName: quoteTargetOffer.airlineName,
        departDate: firstLeg.departureTime ? firstLeg.departureTime.slice(0, 10) : todayIso(),
        notes: els.quoteNotes.value,
      });
      closeQuoteModal();
      alert('Quote request submitted. Your travel desk will follow up with an invoice via your Corporate Dashboard.');
    } catch (err) {
      els.quoteError.textContent = err.message;
      els.quoteError.classList.remove('hidden');
    }
  });
}

// ------------------------- Search submit ---------------------------------------

async function handleSubmit(event) {
  event.preventDefault();

  const legs = collectLegs();
  const validationMessage = validateLegs(legs);
  if (validationMessage) {
    showError(validationMessage);
    return;
  }

  document.getElementById('results-section').classList.remove('hidden');
  document.getElementById('error-state').classList.add('hidden');
  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('results-list').innerHTML = '';
  showSkeletons();

  try {
    const data = await searchFlights({
      legs,
      adults: els.adults.value,
      cabinClass: els.cabinClass.value,
    });

    rawOffers = data.offers || [];
    hideSkeletons();

    if (rawOffers.length === 0) {
      document.getElementById('results-heading').textContent = 'No availability found';
      document.getElementById('empty-state').classList.remove('hidden');
      els.airlinesList.innerHTML = '';
      return;
    }

    populateAirlineFilters(rawOffers);
    populatePriceSlider(rawOffers);
    applyFiltersAndSort();
  } catch (err) {
    hideSkeletons();
    showError(err.message);
  }
}

export function initFlightsSearch() {
  cacheEls();
  setMinDates();
  handleTripTypeChange();
  handleSwap();
  initQuoteModal();

  attachAutocomplete({ inputEl: els.originInput, listEl: els.originSuggestions, codeEl: els.originCode });
  attachAutocomplete({ inputEl: els.destinationInput, listEl: els.destinationSuggestions, codeEl: els.destinationCode });

  els.addLegBtn.addEventListener('click', addLegRow);
  els.form.addEventListener('submit', handleSubmit);

  [els.filterStopDirect, els.filterStop1, els.filterStop2plus].forEach((cb) =>
    cb.addEventListener('change', applyFiltersAndSort)
  );
  els.maxPrice.addEventListener('input', () => {
    els.maxPriceValue.textContent = formatMoney(Number(els.maxPrice.value));
    applyFiltersAndSort();
  });
  els.resetBtn.addEventListener('click', () => {
    resetFilterInputs();
    applyFiltersAndSort();
  });

  document.getElementById('sort-select').addEventListener('change', () => {
    if (rawOffers.length > 0) applyFiltersAndSort();
  });
}
