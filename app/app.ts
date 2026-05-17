(function() {
  'use strict';

  // ==================== CONFIG ====================
  var CONFIG = {
    appName: 'My App',
    storageKey: 'mdg_myapp',
    api: {
      baseUrl: 'https://api.example.com',
      cacheDuration: 5 * 60 * 1000,
    },
  };

  // ==================== STATE ====================
  var state: {
    currentScreen: string,
    screenHistory: string[],
    isLoading: boolean,
    error: string | null,
    data: {},
    cache: {}
  } = {
    currentScreen: 'home',
    screenHistory: [],
    isLoading: false,
    error: null,
    data: {},
    cache: {},
  };

  // ==================== DOM REFS ====================
  const screens: {[screenId: string]: Element} = {};

  function collectScreens() {
    document.querySelectorAll('.screen').forEach(function(s) {
      if (s.id) screens[s.id] = s;
    });
  }

  // ==================== NAVIGATION ====================
  function navigateTo(screenId: string, options: { addToHistory?: boolean } = {}) {
    const addToHistory = options.addToHistory !== false;

    if (addToHistory && state.currentScreen) {
      state.screenHistory.push(state.currentScreen);
    }

    Object.values(screens).forEach(function(s) { s.classList.add('hidden'); });
    if (screens[screenId]) {
      screens[screenId].classList.remove('hidden');
      state.currentScreen = screenId;
      onScreenEnter(screenId);
      focusFirst(screens[screenId]);
    }
  }

  function navigateBack() {
    const last = state.screenHistory.pop();
    if (last) {
      navigateTo(last, { addToHistory: false });
    }
  }

  // ==================== FOCUS MANAGEMENT ====================
  function focusFirst(container: Element) {
    const el = container.querySelector<HTMLElement>('.focusable:not([disabled]):not(.hidden)');
    if (el) el.focus();
  }

  type Focus = 'up' | 'down' | 'left' | 'right';

  function moveFocus(direction: Focus) {
    var container = screens[state.currentScreen];
    if (!container) return;

    var focusables = Array.from(
      container.querySelectorAll<HTMLElement>('.focusable:not([disabled]):not(.hidden)')
    );
    if (focusables.length === 0) return;

    const current = document.activeElement;
    const idx = current instanceof HTMLElement ? focusables.indexOf(current) : -1;

    if (idx === -1) {
      focusFirst(container);
      return;
    }

    var nextIdx;
    if (direction === 'up' || direction === 'left') {
      nextIdx = idx > 0 ? idx - 1 : focusables.length - 1;
    } else {
      nextIdx = idx < focusables.length - 1 ? idx + 1 : 0;
    }
    const next = focusables[nextIdx];
    if (next) {
      next.focus();

      var scrollParent = next.closest('.content, .list-container');
      if (scrollParent) {
        next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  // ==================== UI HELPERS ====================
  function setLoading(isLoading: boolean) {
    state.isLoading = isLoading;
    var spinner = document.getElementById('loading');
    if (spinner) {
      spinner.classList.toggle('hidden', !isLoading);
    }
  }

  function setError(message: string) {
    state.error = message;
    var errorEl = document.getElementById('error');
    if (errorEl) {
      errorEl.classList.remove('hidden');
      var msgEl = errorEl.querySelector('.error-message');
      if (msgEl) msgEl.textContent = message;
    }
  }

  function clearError() {
    state.error = null;
    var errorEl = document.getElementById('error');
    if (errorEl) errorEl.classList.add('hidden');
  }

  function showToast(message: string, type: string) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast' + (type ? ' ' + type : '');
    toast.offsetHeight;
    toast.classList.add('visible');
    setTimeout(function() { toast && toast.classList.remove('visible'); }, 2500);
  }

  function renderList<T>(containerId: string, items: T[], template: (item: T, index: number) => string | Node) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (items.length === 0) {
      container.innerHTML = '<div class="error-container"><div class="error-message">No items found</div></div>';
      return;
    }

    items.forEach(function(item, index) {
      var el = template(item, index);
      if (typeof el === 'string') {
        container.insertAdjacentHTML('beforeend', el);
      } else {
        container.appendChild(el);
      }
    });
  }

  // ==================== DATA PERSISTENCE ====================
  function loadData() {
    try {
      var saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        var data = JSON.parse(saved);
        Object.assign(state.data, data);
      }
    } catch (e) {
      console.error('[Storage] Load error:', e);
    }
  }

  function saveData() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state.data));
    } catch (e) {
      console.error('[Storage] Save error:', e);
    }
  }

  // ==================== ACTION HANDLING ====================
  type Action = 'back' | 'refresh' | AppAction;
  type AppAction = 'TEST';

  function isAction(action: string): action is Action {
    return ['back', 'refresh', 'TEST'].includes(action);
  }

  function handleAction(action: Action, element: unknown) {
    switch (action) {
      case 'back':
        navigateBack();
        break;
      case 'refresh':
        onScreenEnter(state.currentScreen);
        break;
      default:
        handleAppAction(action, element);
        break;
    }
  }

  // === CUSTOMIZE: Add app-specific actions here ===
  function handleAppAction(action: AppAction, element: unknown) {
    console.log('[Action]', action);
  }

  // === CUSTOMIZE: Add screen-specific initialization here ===
  function onScreenEnter(screenId: unknown) {
    // Load data, refresh API, etc.
  }

  // ==================== EVENT LISTENERS ====================
  function setupEvents() {
    document.addEventListener('click', function(e) {
      if (!(e.target instanceof HTMLElement)) return;
      const actionEl = e.target.closest<HTMLElement>('[data-action]');
      const action = actionEl?.dataset['action'];
      if (action && isAction(action)) handleAction(action, actionEl);
    });

    document.addEventListener('keydown', function(e) {
      var isInput = document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
         document.activeElement.tagName === 'TEXTAREA');
      if (isInput && !['Escape', 'Enter'].includes(e.key)) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          moveFocus('up');
          e.preventDefault();
          break;
        case 'ArrowDown':
          moveFocus('down');
          e.preventDefault();
          break;
        case 'ArrowLeft':
          moveFocus('left');
          e.preventDefault();
          break;
        case 'ArrowRight':
          moveFocus('right');
          e.preventDefault();
          break;
        case 'Enter':
          const activeElement = document.activeElement;
          if (!(activeElement instanceof HTMLElement)) break;
          if (isInput) {
            const submitAction = activeElement.dataset['submitAction'];
            if (submitAction && isAction(submitAction))
              handleAction(submitAction, document.activeElement);
          } else if (activeElement.classList.contains('focusable')) {
            activeElement.click();
          }
          e.preventDefault();
          break;
        case 'Escape':
          navigateBack();
          e.preventDefault();
          break;
      }
    });
  }

  // ==================== INITIALIZATION ====================
  function init() {
    collectScreens();
    setupEvents();
    loadData();

    setTimeout(function() {
      navigateTo('home', { addToHistory: false });
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
