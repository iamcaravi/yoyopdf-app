import { renderBottomNav } from '../components/bottom-nav.js';
import { renderProcessingOverlay } from '../components/processing-overlay.js';
import { renderHome } from '../screens/home.js';
import { renderTools } from '../screens/tools.js';
import { renderFiles } from '../screens/files.js';
import { renderSettings } from '../screens/settings.js';
import { renderInfoScreen } from '../screens/info.js';
import { renderMergeScreen } from '../screens/merge.js';
import { renderSplitScreen } from '../screens/split.js';
import { renderReorderScreen } from '../screens/reorder.js';
import { renderDeleteScreen } from '../screens/delete.js';
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
import {
  choosePdfForSplit,
  loadSplitPageThumbnail,
  requestSplitCancellation,
  splitPdfFile,
} from '../services/split-pdf-service.js';
import {
  choosePdfForReorder,
  loadReorderPageThumbnail,
  reorderPdfFile,
  requestReorderCancellation,
} from '../services/reorder-pdf-service.js';
import {
  choosePdfForDelete,
  deletePagesFromPdf,
  loadDeletePageThumbnail,
  requestDeleteCancellation,
} from '../services/delete-pdf-service.js';
import { isPdfDocumentsAvailable } from '../native/pdf-documents.js';
import { initTheme, setTheme } from '../theme/theme.js';
import { addPdfFiles, movePdf, removePdf, validateMerge } from '../tools/merge/state.js';
import { userMessageForError, validationMessage } from '../tools/merge/errors.js';
import { splitValidationMessage } from '../tools/split/errors.js';
import {
  buildSplitPlan,
  createSplitState,
  applySplitSelection,
  selectAllPages,
  toggleSelectedPage,
  withSplitFile,
} from '../tools/split/state.js';
import {
  applyReorderSelection,
  createReorderState,
  movePageByNumber,
  resetPageOrder,
  validatePageOrder,
} from '../tools/reorder/state.js';
import {
  applyDeleteSelection,
  createDeleteState,
  selectAllDeletePages,
  toggleDeletePage,
  validateDeleteSelection,
} from '../tools/delete/state.js';
import { parseRoute } from './routes.js';

const screens = { home: renderHome, tools: renderTools, files: renderFiles, settings: renderSettings };
const emptyMergeState = () => ({ files: [], picking: false, error: null, result: null });

export function startApp(root) {
  if (!root) throw new Error('App root is missing.');
  initTheme();

  let recentFiles = getRecentFiles();
  let mergeState = emptyMergeState();
  let splitState = createSplitState();
  let reorderState = createReorderState();
  let deleteState = createDeleteState();
  const splitThumbnailRequests = new Set();
  const reorderThumbnailRequests = new Set();
  const deleteThumbnailRequests = new Set();
  let splitThumbnailObserver = null;
  let reorderThumbnailObserver = null;
  let deleteThumbnailObserver = null;
  let reorderDrag = null;
  let processingState = null;
  let availabilityChecked = false;

  const render = () => {
    const route = parseRoute(location.hash);
    let screen;
    if (route.root === 'tools' && route.detail === 'merge') {
      screen = renderMergeScreen(mergeState);
    } else if (route.root === 'tools' && route.detail === 'split') {
      screen = renderSplitScreen(splitState);
    } else if (route.root === 'tools' && route.detail === 'reorder') {
      screen = renderReorderScreen(reorderState);
    } else if (route.root === 'tools' && route.detail === 'delete') {
      screen = renderDeleteScreen(deleteState);
    } else if (route.root === 'settings' && route.detail) {
      screen = renderInfoScreen(route.detail);
    } else {
      screen = screens[route.root]({ files: recentFiles });
    }
    root.innerHTML = `<div class="app-shell">
      <main class="app-content ${route.root === 'tools' && ['merge', 'split', 'reorder', 'delete'].includes(route.detail) ? 'app-content--tool' : ''}" id="main-content" tabindex="-1">${screen}</main>
      ${route.detail ? '' : renderBottomNav(route.root)}
      <div class="toast" role="status" aria-live="polite" aria-atomic="true"></div>
      ${renderProcessingOverlay(processingState)}
    </div>`;
    hydrateSplitThumbnails();
    hydrateReorderThumbnails();
    hydrateDeleteThumbnails();
  };

  function hydrateSplitThumbnails() {
    splitThumbnailObserver?.disconnect();
    splitThumbnailObserver = null;
    if (parseRoute(location.hash).detail !== 'split' || !splitState.file) return;
    const load = async (image) => {
      const page = Number(image.dataset.splitThumbnail);
      const key = `${splitState.file.uri}:${page}`;
      if (image.hasAttribute('src') || splitThumbnailRequests.has(key)) return;
      splitThumbnailRequests.add(key);
      const sourceUri = splitState.file.uri;
      try {
        const dataUrl = await loadSplitPageThumbnail(splitState.file, page);
        if (!dataUrl || splitState.file?.uri !== sourceUri) return;
        splitState = { ...splitState, thumbnails: { ...splitState.thumbnails, [page]: dataUrl } };
        root.querySelectorAll(`[data-split-thumbnail="${page}"]`).forEach((thumbnail) => {
          thumbnail.src = dataUrl;
          thumbnail.parentElement?.querySelectorAll('[data-thumbnail-placeholder]').forEach((placeholder) => { placeholder.hidden = true; });
        });
      } catch {
        // A missing preview never blocks selecting or splitting the page.
      } finally {
        splitThumbnailRequests.delete(key);
      }
    };
    const images = [...root.querySelectorAll('[data-split-thumbnail]:not([src])')];
    if (!('IntersectionObserver' in window)) {
      images.slice(0, 8).forEach(load);
      return;
    }
    splitThumbnailObserver = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        splitThumbnailObserver?.unobserve(entry.target);
        load(entry.target);
      });
    }, { rootMargin: '120px' });
    images.forEach((image) => splitThumbnailObserver.observe(image));
  }

  function hydrateReorderThumbnails() {
    reorderThumbnailObserver?.disconnect();
    reorderThumbnailObserver = null;
    if (parseRoute(location.hash).detail !== 'reorder' || !reorderState.file) return;
    const load = async (image) => {
      const page = Number(image.dataset.reorderThumbnail);
      const sourceUri = reorderState.file.uri;
      const key = `${sourceUri}:${page}`;
      if (image.hasAttribute('src') || reorderThumbnailRequests.has(key)) return;
      reorderThumbnailRequests.add(key);
      try {
        const dataUrl = await loadReorderPageThumbnail(reorderState.file, page);
        if (!dataUrl || reorderState.file?.uri !== sourceUri) return;
        reorderState = { ...reorderState, thumbnails: { ...reorderState.thumbnails, [page]: dataUrl } };
        root.querySelectorAll(`[data-reorder-thumbnail="${page}"]`).forEach((thumbnail) => {
          thumbnail.src = dataUrl;
          thumbnail.parentElement?.querySelectorAll('[data-thumbnail-placeholder]').forEach((placeholder) => { placeholder.hidden = true; });
        });
      } catch {
        // A missing preview never blocks reordering the underlying PDF page.
      } finally {
        reorderThumbnailRequests.delete(key);
      }
    };
    const images = [...root.querySelectorAll('[data-reorder-thumbnail]:not([src])')];
    if (!('IntersectionObserver' in window)) {
      images.slice(0, 8).forEach(load);
      return;
    }
    reorderThumbnailObserver = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        reorderThumbnailObserver?.unobserve(entry.target);
        load(entry.target);
      });
    }, { rootMargin: '120px' });
    images.forEach((image) => reorderThumbnailObserver.observe(image));
  }

  function hydrateDeleteThumbnails() {
    deleteThumbnailObserver?.disconnect();
    deleteThumbnailObserver = null;
    if (parseRoute(location.hash).detail !== 'delete' || !deleteState.file) return;
    const load = async (image) => {
      const page = Number(image.dataset.deleteThumbnail);
      const sourceUri = deleteState.file.uri;
      const key = `${sourceUri}:${page}`;
      if (image.hasAttribute('src') || deleteThumbnailRequests.has(key)) return;
      deleteThumbnailRequests.add(key);
      try {
        const dataUrl = await loadDeletePageThumbnail(deleteState.file, page);
        if (!dataUrl || deleteState.file?.uri !== sourceUri) return;
        deleteState = { ...deleteState, thumbnails: { ...deleteState.thumbnails, [page]: dataUrl } };
        root.querySelectorAll(`[data-delete-thumbnail="${page}"]`).forEach((thumbnail) => {
          thumbnail.src = dataUrl;
          thumbnail.parentElement?.querySelectorAll('[data-thumbnail-placeholder]').forEach((placeholder) => { placeholder.hidden = true; });
        });
      } catch {
        // A missing preview never blocks deleting the underlying PDF page.
      } finally {
        deleteThumbnailRequests.delete(key);
      }
    };
    const images = [...root.querySelectorAll('[data-delete-thumbnail]:not([src])')];
    if (!('IntersectionObserver' in window)) {
      images.slice(0, 8).forEach(load);
      return;
    }
    deleteThumbnailObserver = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        deleteThumbnailObserver?.unobserve(entry.target);
        load(entry.target);
      });
    }, { rootMargin: '120px' });
    images.forEach((image) => deleteThumbnailObserver.observe(image));
  }

  function refreshSplitValidation() {
    const plan = buildSplitPlan(splitState);
    const action = root.querySelector('[data-split-run]');
    const note = action?.parentElement?.querySelector('small');
    const alert = root.querySelector('[data-split-validation]');
    const message = splitValidationMessage(plan.code);
    if (action) action.disabled = !plan.valid;
    if (note) note.textContent = plan.valid
      ? `${plan.groups.length} output ${plan.groups.length === 1 ? 'file' : 'files'} · ${plan.groups.length === 1 ? 'PDF' : 'ZIP'} result`
      : 'Choose valid pages to continue';
    if (alert) {
      alert.hidden = !message;
      const copy = alert.querySelector('span');
      if (copy) copy.textContent = message || '';
    }
  }

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

  const runSplitPicker = async () => {
    splitState = { ...splitState, picking: true, error: null };
    render();
    try {
      const selection = await choosePdfForSplit();
      if (selection.cancelled) {
        splitState = applySplitSelection(splitState, selection);
        render();
        showToast('Selection cancelled. No file was added.');
        return;
      }
      if (!selection.file) {
        const rejectedCode = selection.rejected?.[0]?.code || 'INVALID_PDF';
        splitState = { ...splitState, picking: false, error: userMessageForError({ code: rejectedCode }) };
      } else {
        splitState = applySplitSelection(splitState, selection);
      }
      render();
    } catch (error) {
      splitState = { ...splitState, picking: false, error: userMessageForError(error) };
      render();
    }
  };

  const runSplit = async () => {
    const plan = buildSplitPlan(splitState);
    if (!plan.valid) {
      splitState = { ...splitState, error: splitValidationMessage(plan.code) };
      render();
      return;
    }
    processingState = {
      status: 'processing',
      operation: 'split',
      title: 'Splitting your PDF',
      message: 'Preparing pages on this device…',
      cancellable: true,
      cancelling: false,
    };
    splitState = { ...splitState, error: null };
    render();
    try {
      const result = await splitPdfFile(splitState.file, plan.groups, (progress) => {
        if (!processingState || processingState.operation !== 'split') return;
        const hasCount = Number.isFinite(Number(progress.completed)) && Number.isFinite(Number(progress.total));
        processingState = {
          ...processingState,
          title: progress.phase === 'saving' ? 'Saving your split output' : progress.phase === 'awaitingSave' ? 'Choose a save location' : 'Splitting your PDF',
          message: progress.message || processingState.message,
          completed: hasCount ? Number(progress.completed) : undefined,
          total: hasCount ? Number(progress.total) : undefined,
          cancellable: progress.phase === 'splitting',
        };
        render();
      });
      if (result.cancelled) {
        processingState = null;
        render();
        showToast('Save cancelled. Your original PDF was not changed.');
        return;
      }
      recentFiles = recordRecentFile(recentFiles, result);
      splitState = { ...splitState, result };
      processingState = { status: 'success', operation: 'split', title: 'Split complete', message: 'Your output was saved successfully.' };
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
        showToast('Split cancelled. Your original PDF was not changed.');
        return;
      }
      const message = userMessageForError(error);
      splitState = { ...splitState, error: message };
      processingState = { status: 'failure', operation: 'split', title: 'Split didn’t finish', message };
      render();
    }
  };

  const runReorderPicker = async () => {
    reorderState = { ...reorderState, picking: true, error: null };
    render();
    try {
      const selection = await choosePdfForReorder();
      if (selection.cancelled) {
        reorderState = applyReorderSelection(reorderState, selection);
        render();
        showToast('Selection cancelled. No file was added.');
        return;
      }
      if (!selection.file) {
        const rejectedCode = selection.rejected?.[0]?.code || 'INVALID_PDF';
        reorderState = { ...reorderState, picking: false, error: userMessageForError({ code: rejectedCode }) };
      } else {
        reorderState = applyReorderSelection(reorderState, selection);
      }
      render();
    } catch (error) {
      reorderState = { ...reorderState, picking: false, error: userMessageForError(error) };
      render();
    }
  };

  const runReorder = async () => {
    const validation = validatePageOrder(reorderState.order, reorderState.file?.pageCount);
    if (!validation.valid) {
      reorderState = { ...reorderState, error: userMessageForError({ code: validation.code }) };
      render();
      return;
    }
    processingState = {
      status: 'processing',
      operation: 'reorder',
      title: 'Reordering your PDF',
      message: 'Copying pages in the order you chose…',
      cancellable: true,
      cancelling: false,
    };
    reorderState = { ...reorderState, error: null };
    render();
    try {
      const result = await reorderPdfFile(reorderState.file, validation.order, (progress) => {
        if (!processingState || processingState.operation !== 'reorder') return;
        const hasCount = Number.isFinite(Number(progress.completed)) && Number.isFinite(Number(progress.total));
        processingState = {
          ...processingState,
          title: progress.phase === 'saving' ? 'Saving your reordered PDF' : progress.phase === 'awaitingSave' ? 'Choose a save location' : 'Reordering your PDF',
          message: progress.message || processingState.message,
          completed: hasCount ? Number(progress.completed) : undefined,
          total: hasCount ? Number(progress.total) : undefined,
          cancellable: progress.phase === 'reordering',
        };
        render();
      });
      if (result.cancelled) {
        processingState = null;
        render();
        showToast('Save cancelled. Your original PDF was not changed.');
        return;
      }
      recentFiles = recordRecentFile(recentFiles, result);
      reorderState = { ...reorderState, result };
      processingState = { status: 'success', operation: 'reorder', title: 'Reorder complete', message: 'Your PDF was saved successfully.' };
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
        showToast('Reorder cancelled. Your original PDF was not changed.');
        return;
      }
      const message = userMessageForError(error);
      reorderState = { ...reorderState, error: message };
      processingState = { status: 'failure', operation: 'reorder', title: 'Reorder didn’t finish', message };
      render();
    }
  };

  const runDeletePicker = async () => {
    deleteState = { ...deleteState, picking: true, error: null };
    render();
    try {
      const selection = await choosePdfForDelete();
      if (selection.cancelled) {
        deleteState = applyDeleteSelection(deleteState, selection);
        render();
        showToast('Selection cancelled. No file was added.');
        return;
      }
      if (!selection.file) {
        const rejectedCode = selection.rejected?.[0]?.code || 'INVALID_PDF';
        deleteState = { ...deleteState, picking: false, error: userMessageForError({ code: rejectedCode }) };
      } else {
        deleteState = applyDeleteSelection(deleteState, selection);
      }
      render();
    } catch (error) {
      deleteState = { ...deleteState, picking: false, error: userMessageForError(error) };
      render();
    }
  };

  const runDelete = async () => {
    const validation = validateDeleteSelection(deleteState.selectedPages, deleteState.file?.pageCount);
    if (!validation.valid) {
      deleteState = { ...deleteState, error: userMessageForError({ code: validation.code }) };
      render();
      return;
    }
    processingState = {
      status: 'processing',
      operation: 'delete',
      title: 'Removing selected pages',
      message: 'Copying the pages you want to keep…',
      cancellable: true,
      cancelling: false,
    };
    deleteState = { ...deleteState, error: null };
    render();
    try {
      const result = await deletePagesFromPdf(deleteState.file, validation.pages, (progress) => {
        if (!processingState || processingState.operation !== 'delete') return;
        const hasCount = Number.isFinite(Number(progress.completed)) && Number.isFinite(Number(progress.total));
        processingState = {
          ...processingState,
          title: progress.phase === 'saving' ? 'Saving your updated PDF' : progress.phase === 'awaitingSave' ? 'Choose a save location' : 'Removing selected pages',
          message: progress.message || processingState.message,
          completed: hasCount ? Number(progress.completed) : undefined,
          total: hasCount ? Number(progress.total) : undefined,
          cancellable: progress.phase === 'deleting',
        };
        render();
      });
      if (result.cancelled) {
        processingState = null;
        render();
        showToast('Save cancelled. Your original PDF was not changed.');
        return;
      }
      recentFiles = recordRecentFile(recentFiles, result);
      deleteState = { ...deleteState, result };
      processingState = { status: 'success', operation: 'delete', title: 'Pages deleted', message: 'Your updated PDF was saved successfully.' };
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
        showToast('Page deletion cancelled. Your original PDF was not changed.');
        return;
      }
      const message = userMessageForError(error);
      deleteState = { ...deleteState, error: message };
      processingState = { status: 'failure', operation: 'delete', title: 'Pages weren’t deleted', message };
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
      splitState = splitState.result?.uri === file.uri ? { ...splitState, error: userMessageForError(error) } : splitState;
      reorderState = reorderState.result?.uri === file.uri ? { ...reorderState, error: userMessageForError(error) } : reorderState;
      deleteState = deleteState.result?.uri === file.uri ? { ...deleteState, error: userMessageForError(error) } : deleteState;
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
    if (target.closest('[data-split-pick]')) return runSplitPicker();
    if (target.closest('[data-reorder-pick]')) return runReorderPicker();
    if (target.closest('[data-delete-pick]')) return runDeletePicker();
    if (target.closest('[data-delete-remove-file]')) {
      deleteState = createDeleteState();
      render();
      return;
    }
    const deletePage = target.closest('[data-delete-page]');
    if (deletePage) {
      deleteState = { ...deleteState, selectedPages: toggleDeletePage(deleteState.selectedPages, Number(deletePage.dataset.deletePage)), error: null };
      render();
      return;
    }
    if (target.closest('[data-delete-select-all]')) {
      deleteState = { ...deleteState, selectedPages: selectAllDeletePages(deleteState.file.pageCount), error: null };
      render();
      return;
    }
    if (target.closest('[data-delete-clear]')) {
      deleteState = { ...deleteState, selectedPages: [], error: null };
      render();
      return;
    }
    if (target.closest('[data-delete-run]')) return runDelete();
    if (target.closest('[data-reorder-remove-file]')) {
      reorderState = createReorderState();
      render();
      return;
    }
    const reorderMove = target.closest('[data-reorder-move-page]');
    if (reorderMove) {
      reorderState = {
        ...reorderState,
        order: movePageByNumber(reorderState.order, Number(reorderMove.dataset.reorderMovePage), Number(reorderMove.dataset.reorderTo)),
        error: null,
      };
      render();
      return;
    }
    if (target.closest('[data-reorder-reset]')) {
      reorderState = { ...reorderState, order: resetPageOrder(reorderState.file.pageCount), error: null };
      render();
      showToast('Original page order restored.');
      return;
    }
    if (target.closest('[data-reorder-run]')) return runReorder();
    if (target.closest('[data-split-remove-file]')) {
      splitState = createSplitState();
      render();
      return;
    }
    const splitMode = target.closest('[data-split-mode]');
    if (splitMode) {
      splitState = { ...splitState, mode: splitMode.dataset.splitMode, error: null };
      render();
      return;
    }
    const rangeKind = target.closest('[data-split-range-kind]');
    if (rangeKind) {
      splitState = { ...splitState, rangeKind: rangeKind.dataset.splitRangeKind, error: null };
      render();
      return;
    }
    if (target.closest('[data-split-add-range]')) {
      splitState = {
        ...splitState,
        ranges: [...splitState.ranges, { id: splitState.nextRangeId, from: 1, to: splitState.file.pageCount }],
        nextRangeId: splitState.nextRangeId + 1,
        error: null,
      };
      render();
      return;
    }
    const removeRange = target.closest('[data-split-remove-range]');
    if (removeRange) {
      splitState = { ...splitState, ranges: splitState.ranges.filter((range) => range.id !== Number(removeRange.dataset.splitRemoveRange)), error: null };
      render();
      return;
    }
    const pageButton = target.closest('[data-split-page]');
    if (pageButton && splitState.mode === 'pages') {
      splitState = { ...splitState, selectedPages: toggleSelectedPage(splitState.selectedPages, Number(pageButton.dataset.splitPage)), error: null };
      render();
      return;
    }
    if (target.closest('[data-split-select-all]')) {
      splitState = { ...splitState, selectedPages: selectAllPages(splitState.file.pageCount), error: null };
      render();
      return;
    }
    if (target.closest('[data-split-clear-pages]')) {
      splitState = { ...splitState, selectedPages: [], error: null };
      render();
      return;
    }
    if (target.closest('[data-split-run]')) return runSplit();
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
      if (processingState.operation === 'split') await requestSplitCancellation();
      else if (processingState.operation === 'reorder') await requestReorderCancellation();
      else if (processingState.operation === 'delete') await requestDeleteCancellation();
      else await requestMergeCancellation();
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
    if (target.closest('[data-split-another]')) {
      splitState = createSplitState();
      render();
      return;
    }
    if (target.closest('[data-reorder-another]')) {
      reorderState = createReorderState();
      render();
      return;
    }
    if (target.closest('[data-delete-another]')) {
      deleteState = createDeleteState();
      render();
      return;
    }
    const activeDetail = parseRoute(location.hash).detail;
    const activeResult = activeDetail === 'split' ? splitState.result : activeDetail === 'reorder' ? reorderState.result : activeDetail === 'delete' ? deleteState.result : mergeState.result;
    if (target.closest('[data-result-open]') && activeResult) return useFileAction(activeResult.uri, openRecentFile);
    if (target.closest('[data-result-share]') && activeResult) return useFileAction(activeResult.uri, shareRecentFile);
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

  root.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('[data-reorder-drag]');
    if (!handle || event.button !== 0) return;
    const page = Number(handle.dataset.reorderDrag);
    if (!reorderState.order.includes(page)) return;
    event.preventDefault();
    handle.setPointerCapture?.(event.pointerId);
    reorderDrag = { page, pointerId: event.pointerId, handle };
    reorderState = { ...reorderState, draggingPage: page };
    handle.closest('[data-reorder-card]')?.classList.add('is-dragging');
  });

  root.addEventListener('pointermove', (event) => {
    if (!reorderDrag || event.pointerId !== reorderDrag.pointerId) return;
    event.preventDefault();
    if (event.clientY < 90) window.scrollBy({ top: -14, behavior: 'auto' });
    if (event.clientY > window.innerHeight - 110) window.scrollBy({ top: 14, behavior: 'auto' });
    const destination = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-reorder-card]');
    if (!destination) return;
    const toIndex = reorderState.order.indexOf(Number(destination.dataset.reorderCard));
    const fromIndex = reorderState.order.indexOf(reorderDrag.page);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    reorderState = { ...reorderState, order: movePageByNumber(reorderState.order, reorderDrag.page, toIndex), error: null };
    const grid = root.querySelector('[data-reorder-grid]');
    if (!grid) return;
    reorderState.order.forEach((page) => {
      const card = grid.querySelector(`[data-reorder-card="${page}"]`);
      if (card) grid.appendChild(card);
    });
    [...grid.querySelectorAll('[data-reorder-card]')].forEach((card, index, cards) => {
      card.dataset.reorderIndex = index;
      const position = card.querySelector('.reorder-page__position');
      if (position) {
        position.textContent = String(index + 1);
        position.setAttribute('aria-label', `Position ${index + 1}`);
      }
      const controls = [...card.querySelectorAll('[data-reorder-move-page]')];
      if (controls.length === 4) {
        controls[0].dataset.reorderTo = '0';
        controls[0].disabled = index === 0;
        controls[1].dataset.reorderTo = String(index - 1);
        controls[1].disabled = index === 0;
        controls[2].dataset.reorderTo = String(index + 1);
        controls[2].disabled = index === cards.length - 1;
        controls[3].dataset.reorderTo = String(cards.length - 1);
        controls[3].disabled = index === cards.length - 1;
      }
    });
  });

  const finishReorderDrag = (event) => {
    if (!reorderDrag || event.pointerId !== reorderDrag.pointerId) return;
    reorderDrag.handle.releasePointerCapture?.(event.pointerId);
    reorderDrag = null;
    reorderState = { ...reorderState, draggingPage: null };
    render();
  };
  root.addEventListener('pointerup', finishReorderDrag);
  root.addEventListener('pointercancel', finishReorderDrag);

  root.addEventListener('input', (event) => {
    const fromInput = event.target.closest('[data-split-range-from]');
    const toInput = event.target.closest('[data-split-range-to]');
    const everyInput = event.target.closest('[data-split-every]');
    if (fromInput || toInput) {
      const id = Number((fromInput || toInput).dataset[fromInput ? 'splitRangeFrom' : 'splitRangeTo']);
      const key = fromInput ? 'from' : 'to';
      splitState = { ...splitState, ranges: splitState.ranges.map((range) => range.id === id ? { ...range, [key]: Number(event.target.value) } : range), error: null };
      refreshSplitValidation();
      return;
    }
    if (everyInput) {
      splitState = { ...splitState, everyN: Number(everyInput.value), error: null };
      refreshSplitValidation();
      return;
    }
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
    if (event.target.matches('[data-split-range-from], [data-split-range-to], [data-split-every]')) {
      refreshSplitValidation();
      return;
    }
    if (event.target.matches('[data-split-page-output]')) {
      splitState = { ...splitState, pageOutput: event.target.value, error: null };
      render();
      return;
    }
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
