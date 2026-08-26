import { fetchAutocomplete } from './api.js';
import { debounce, escapeHtml } from './utils.js';

/**
 * Wires a text input to a live city/airport autocomplete dropdown.
 *
 * @param {object} opts
 * @param {HTMLInputElement} opts.inputEl     visible text input
 * @param {HTMLElement} opts.listEl           <ul> to render suggestions into
 * @param {HTMLInputElement} opts.codeEl      hidden input that stores the selected IATA code
 * @param {HTMLInputElement} [opts.nameEl]    optional hidden input that stores the display/city name
 * @param {() => void} [opts.onSelect]        optional callback fired after a selection is made
 */
export function attachAutocomplete({ inputEl, listEl, codeEl, nameEl, onSelect }) {
  let suggestions = [];
  let activeIndex = -1;

  function closeList() {
    listEl.classList.add('hidden');
    listEl.innerHTML = '';
    activeIndex = -1;
  }

  function selectSuggestion(item) {
    inputEl.value = item.label;
    codeEl.value = item.code;
    if (nameEl) nameEl.value = item.cityName || item.name;
    closeList();
    if (onSelect) onSelect(item);
  }

  function renderList() {
    if (suggestions.length === 0) {
      closeList();
      return;
    }
    listEl.innerHTML = suggestions
      .map(
        (item, index) => `
        <li class="autocomplete-item${index === activeIndex ? ' active' : ''}" data-index="${index}" role="option">
          <span class="font-medium">${escapeHtml(item.name)}</span>
          <span class="text-slate-400"> — ${escapeHtml(item.countryName)} (${escapeHtml(item.code)})</span>
        </li>`
      )
      .join('');
    listEl.classList.remove('hidden');
  }

  const runSearch = debounce(async (term) => {
    if (term.trim().length < 2) {
      closeList();
      return;
    }
    try {
      suggestions = await fetchAutocomplete(term.trim());
      activeIndex = -1;
      renderList();
    } catch {
      closeList();
    }
  }, 250);

  inputEl.addEventListener('input', () => {
    codeEl.value = '';
    if (nameEl) nameEl.value = '';
    runSearch(inputEl.value);
  });

  inputEl.addEventListener('keydown', (event) => {
    if (listEl.classList.contains('hidden')) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
      renderList();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderList();
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0) {
        event.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      closeList();
    }
  });

  listEl.addEventListener('mousedown', (event) => {
    const li = event.target.closest('li[data-index]');
    if (!li) return;
    event.preventDefault();
    selectSuggestion(suggestions[Number(li.dataset.index)]);
  });

  inputEl.addEventListener('blur', () => {
    // Delay so a click on the list (mousedown above) registers first.
    setTimeout(closeList, 150);
  });
}
