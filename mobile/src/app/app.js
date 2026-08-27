import { renderBottomNav } from '../components/bottom-nav.js';
import { renderProcessingOverlay } from '../components/processing-overlay.js';
import { renderHome } from '../screens/home.js';
import { renderTools } from '../screens/tools.js';
import { renderFiles } from '../screens/files.js';
import { renderSettings } from '../screens/settings.js';
import { renderInfoScreen } from '../screens/info.js';
import { renderMergeScreen } from '../screens/merge.js';
import {
  getRecentFiles,
  markRecentFileUnavailable,
  openRecentFile,
  recordRecentFile,
  refreshRecentFileAvailability,
  removeRecentFileMetadata,
  shareRecentFile,
} from '../services/file-service.js';
import {
  choosePdfFiles,
  mergePdfFiles,
  requestMergeCancellation,
} from '../services/merge-pdf-service.js';
import { isPdfDocumentsAvailable } from '../native/pdf-documents.js';
import { initTheme, setTheme } from '../theme/theme.js';
import { addPdfFiles, movePdf, removePdf, validateMerge } from '../tools/merge/state.js';
import { userMessageForError, validationMessage } from '../tools/merge/errors.js';
import { parseRoute } from './routes.js';

const screens = { home: renderHome, tools: renderTools, files: renderFiles, settings: renderSettings };
const emptyMergeState = () => ({ files: [], picking: false, error: null, result: null });

export function startApp(root) {
  if (!root) throw new Error('App root is missing.');
  initTheme();

  let recentFiles = getRecentFiles();
  let mergeState = emptyMergeState();
  let processingState = null;
  let availabilityChecked = false;

  const render = () => {
    const route = parseRoute(location.hash);
    let screen;
    if (route.root === 'tools' && route.detail === 'merge') {
      screen = renderMergeScreen(mergeState);
    } else if (route.root === 'settings' && route.detail) {
      screen = renderInfoScreen(route.detail);
    } else {
      screen = screens[route.root]({ files: recentFiles });
    }
    root.innerHTML = `<div class="app-shell">
      <main class="app-content ${route.root === 'tools' && route.detail === 'merge' ? 'app-content--tool' : ''}" id="main-content" tabindex="-1">${screen}</main>
      ${route.detail ? '' : renderBottomNav(route.root)}
      <div class="toast" role="status" aria-live="polite" aria-atomic="true"></div>
      ${renderProcessingOverlay(processingState)}
    </div>`;
  };

  const showToast = (message) => {
    const toast = root.querySelector('.toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('toast--visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('toast--visible'), 2800);
  };

  const refreshAvailability = async () => {
    if (availabilityChecked || !recentFiles.length || !isPdfDocumentsAvailable()) return;
    availabilityChecked = true;
    recentFiles = await refreshRecentFileAvailability(recentFiles);
    render();
  };

  const runPicker = async () => {
    mergeState = { ...mergeState, picking: true, error: null };
    render();
    try {
      const selection = await choosePdfFiles();
      mergeState = { ...mergeState, picking: false };
      if (selection.cancelled) {
        render();
        showToast('Selection cancelled. No files were added.');
        return;
      }
      const added = addPdfFiles(mergeState.files, selection.files);
      const nativeDuplicates = Number(selection.duplicates) || 0;
      const rejected = Array.isArray(selection.rejected) ? selection.rejected : [];
      mergeState = {
        ...mergeState,
        files: added.files,
        error: rejected.length ? validationMessage(rejected[0].code) : null,
      };
      render();
      const duplicateCount = added.duplicateCount + nativeDuplicates;
      if (duplicateCount) showToast(`${duplicateCount} duplicate ${duplicateCount === 1 ? 'PDF was' : 'PDFs were'} skipped.`);
      if (rejected.length) showToast(`${rejected.length} invalid or inaccessible ${rejected.length === 1 ? 'file was' : 'files were'} not added.`);
    } catch (error) {
      mergeState = { ...mergeState, picking: false, error: userMessageForError(error) };
      render();
    }
  };

  const runMerge = async () => {
    const validation = validateMerge(mergeState.files);
    if (!validation.valid) {
      mergeState = { ...mergeState, error: validationMessage(validation.code) };
      render();
      return;
    }
    processingState = {
      status: 'processing',
      title: 'Merging your PDFs',
      message: 'Preparing documents on this device…',
      cancellable: true,
      cancelling: false,
    };
    mergeState = { ...mergeState, error: null };
    render();

    try {
      const result = await mergePdfFiles(mergeState.files, (progress) => {
        if (!processingState || processingState.status !== 'processing') return;
        const hasCount = Number.isFinite(Number(progress.completed)) && Number.isFinite(Number(progress.total));
        processingState = {
          ...processingState,
          title: progress.phase === 'saving' ? 'Saving your PDF' : progress.phase === 'awaitingSave' ? 'Choose a save location' : 'Merging your PDFs',
          message: progress.message || processingState.message,
          completed: hasCount ? Number(progress.completed) : undefined,
          total: hasCount ? Number(progress.total) : undefined,
          cancellable: progress.phase === 'merging',
        };
        render();
      });
      if (result.cancelled) {
        processingState = null;
        render();
        showToast('Save cancelled. Your original PDFs were not changed.');
        return;
      }
      recentFiles = recordRecentFile(recentFiles, result);
      mergeState = { ...mergeState, result };
      processingState = {
        status: 'success',
        title: 'Merge complete',
        message: 'Your PDF was saved successfully.',
      };
      render();
      setTimeout(() => {
        processingState = null;
        render();
      }, 700);
    } catch (error) {
      const code = error?.code || error?.data?.code;
      if (code === 'CANCELLED') {
        processingState = null;
        render();
        showToast('Merge cancelled. Your original PDFs were not changed.');
        return;
      }
      const message = userMessageForError(error);
      mergeState = { ...mergeState, error: message };
      processingState = {
        status: 'failure',
        title: 'Merge didn’t finish',
        message,
      };
      render();
    }
  };

  const fileById = (id) => recentFiles.find((file) => file.id === id);
  const useFileAction = async (id, action) => {
    const file = fileById(id);
    if (!file) return;
    try {
      await action(file);
    } catch (error) {
      recentFiles = markRecentFileUnavailable(recentFiles, id);
      mergeState = mergeState.result?.uri === file.uri ? { ...mergeState, error: userMessageForError(error) } : mergeState;
      render();
      showToast(userMessageForError(error));
    }
  };

  root.addEventListener('click', async (event) => {
    const target = event.target;
    const plannedAction = target.closest('[data-planned-action]');
    if (plannedAction) {
      showToast(`${plannedAction.dataset.plannedAction} is planned for a future phase.`);
      return;
    }
    if (target.closest('[data-merge-add]')) return runPicker();
    if (target.closest('[data-merge-clear]')) {
      mergeState = emptyMergeState();
      render();
      return;
    }
    const removeButton = target.closest('[data-remove-pdf]');
    if (removeButton) {
      mergeState = { ...mergeState, files: removePdf(mergeState.files, removeButton.dataset.removePdf), error: null };
      render();
      return;
    }
    const moveButton = target.closest('[data-move-from]');
    if (moveButton) {
      mergeState = { ...mergeState, files: movePdf(mergeState.files, Number(moveButton.dataset.moveFrom), Number(moveButton.dataset.moveTo)) };
      render();
      return;
    }
    if (target.closest('[data-merge-run]')) return runMerge();
    if (target.closest('[data-processing-cancel]')) {
      processingState = { ...processingState, cancelling: true, message: 'Cancelling after the current file…' };
      render();
      await requestMergeCancellation();
      return;
    }
    if (target.closest('[data-processing-close]')) {
      processingState = null;
      render();
      return;
    }
    if (target.closest('[data-merge-another]')) {
      mergeState = emptyMergeState();
      render();
      return;
    }
    if (target.closest('[data-result-open]') && mergeState.result) return useFileAction(mergeState.result.uri, openRecentFile);
    if (target.closest('[data-result-share]') && mergeState.result) return useFileAction(mergeState.result.uri, shareRecentFile);
    const openButton = target.closest('[data-recent-open]');
    if (openButton) return useFileAction(openButton.dataset.recentOpen, openRecentFile);
    const shareButton = target.closest('[data-recent-share]');
    if (shareButton) return useFileAction(shareButton.dataset.recentShare, shareRecentFile);
    const recentRemove = target.closest('[data-recent-remove]');
    if (recentRemove) {
      recentFiles = removeRecentFileMetadata(recentFiles, recentRemove.dataset.recentRemove);
      render();
      showToast('Removed from recent files. The saved PDF was not deleted.');
    }
  });

  root.addEventListener('input', (event) => {
    if (!event.target.matches('[data-tool-search]')) return;
    const query = event.target.value.trim().toLowerCase();
    root.querySelectorAll('[data-tool-name]').forEach((item) => {
      item.hidden = !item.dataset.toolName.includes(query);
    });
    root.querySelectorAll('[data-tool-group]').forEach((group) => {
      group.hidden = !group.querySelector('[data-tool-name]:not([hidden])');
    });
    const empty = root.querySelector('[data-search-empty]');
    if (empty) empty.hidden = Boolean(root.querySelector('[data-tool-name]:not([hidden])'));
  });

  root.addEventListener('change', (event) => {
    if (event.target.name !== 'theme') return;
    setTheme(event.target.value);
    root.querySelector('[data-theme-label]').textContent = event.target.value[0].toUpperCase() + event.target.value.slice(1);
  });

  window.addEventListener('hashchange', () => {
    render();
    refreshAvailability();
  });
  if (!location.hash) history.replaceState(null, '', '#/home');
  render();
  refreshAvailability();
}
