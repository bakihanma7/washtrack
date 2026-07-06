/* ==========================================================
   WashTrack Pro — custom dropdown component
   A small, dependency-free, keyboard-accessible listbox dropdown
   used in place of native <select> elements so styling stays
   consistent with the Luminous Care design system.

   Usage:
     const dd = createDropdown({
       options: [{ value: 'a', label: 'Option A' }, ...],
       value: 'a',
       ariaLabel: 'Sort customers by',
       onChange: (value) => { ... },
     });
     someContainer.appendChild(dd.root);
     dd.getValue();
     dd.setValue('b');
   ========================================================== */

let __dropdownIdCounter = 0;

function createDropdown({ options, value, ariaLabel, onChange, buttonClass, listboxClass }) {
  const uid = 'dd-' + (++__dropdownIdCounter);
  let currentValue = value != null ? value : (options[0] && options[0].value);
  let outsideClickHandler = null;
  let listboxKeydownHandler = null;

  const root = document.createElement('div');
  root.className = 'relative inline-block';

  const button = document.createElement('button');
  button.type = 'button';
  button.id = uid + '-btn';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', ariaLabel || 'Select an option');
  button.className = buttonClass || 'flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-[12px] py-1.5 px-3 focus:ring-2 focus:ring-primary-container outline-none hover:bg-surface-container-low transition-colors';

  const labelSpan = document.createElement('span');
  labelSpan.id = uid + '-label';
  const chevron = document.createElement('span');
  chevron.className = 'material-symbols-outlined text-[16px] text-on-surface-variant transition-transform';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = 'expand_more';
  button.appendChild(labelSpan);
  button.appendChild(chevron);

  const listbox = document.createElement('ul');
  listbox.id = uid + '-listbox';
  listbox.setAttribute('role', 'listbox');
  listbox.setAttribute('tabindex', '-1');
  listbox.setAttribute('aria-label', ariaLabel || 'Options');
  listbox.className = listboxClass || 'hidden absolute z-20 mt-1 min-w-full w-max bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-64 overflow-y-auto';
  button.setAttribute('aria-controls', listbox.id);

  function renderOptions() {
    listbox.innerHTML = '';
    options.forEach(opt => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '-1');
      li.dataset.value = opt.value;
      const selected = opt.value === currentValue;
      li.setAttribute('aria-selected', String(selected));
      li.className = 'px-4 py-2 text-[13px] cursor-pointer whitespace-nowrap outline-none ' +
        (selected ? 'bg-primary-container/20 text-on-primary-container font-semibold' : 'text-on-surface hover:bg-surface-container-low');
      li.textContent = opt.label;
      li.addEventListener('click', () => selectValue(opt.value));
      li.addEventListener('mouseenter', () => li.classList.add('bg-surface-container-low'));
      li.addEventListener('mouseleave', () => { if (li.getAttribute('aria-selected') !== 'true') li.classList.remove('bg-surface-container-low'); });
      listbox.appendChild(li);
    });
  }

  function updateLabel() {
    const found = options.find(o => o.value === currentValue);
    labelSpan.textContent = found ? found.label : '';
  }

  function selectValue(v, opts) {
    opts = opts || {};
    const changed = v !== currentValue;
    currentValue = v;
    updateLabel();
    renderOptions();
    close({ returnFocus: opts.returnFocus !== false });
    if (changed && typeof onChange === 'function') onChange(currentValue);
  }

  function getFocusableOptions() {
    return Array.from(listbox.querySelectorAll('[role="option"]'));
  }

  function open() {
    if (!listbox.classList.contains('hidden')) return;
    listbox.classList.remove('hidden');
    button.setAttribute('aria-expanded', 'true');
    chevron.style.transform = 'rotate(180deg)';

    const opts = getFocusableOptions();
    const activeOpt = opts.find(o => o.dataset.value === currentValue) || opts[0];
    if (activeOpt) activeOpt.focus();

    outsideClickHandler = (e) => {
      if (!root.contains(e.target)) close({ returnFocus: false });
    };
    document.addEventListener('mousedown', outsideClickHandler);

    listboxKeydownHandler = (e) => {
      const focusable = getFocusableOptions();
      const idx = focusable.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = focusable[(idx + 1) % focusable.length];
        if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = focusable[(idx - 1 + focusable.length) % focusable.length];
        if (prev) prev.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        if (focusable[0]) focusable[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        if (focusable[focusable.length - 1]) focusable[focusable.length - 1].focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const el = document.activeElement;
        if (el && el.dataset && el.dataset.value != null) selectValue(el.dataset.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close({ returnFocus: true });
      } else if (e.key === 'Tab') {
        close({ returnFocus: false });
      }
    };
    listbox.addEventListener('keydown', listboxKeydownHandler);
  }

  function close(opts) {
    opts = opts || {};
    if (listbox.classList.contains('hidden')) return;
    listbox.classList.add('hidden');
    button.setAttribute('aria-expanded', 'false');
    chevron.style.transform = '';
    if (outsideClickHandler) { document.removeEventListener('mousedown', outsideClickHandler); outsideClickHandler = null; }
    if (listboxKeydownHandler) { listbox.removeEventListener('keydown', listboxKeydownHandler); listboxKeydownHandler = null; }
    if (opts.returnFocus) button.focus();
  }

  button.addEventListener('click', () => {
    if (listbox.classList.contains('hidden')) open(); else close({ returnFocus: false });
  });
  button.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });

  renderOptions();
  updateLabel();
  root.appendChild(button);
  root.appendChild(listbox);

  return {
    root,
    getValue: () => currentValue,
    setValue: (v) => { currentValue = v; updateLabel(); renderOptions(); },
    setOptions: (newOptions) => { options = newOptions; renderOptions(); updateLabel(); },
  };
}
