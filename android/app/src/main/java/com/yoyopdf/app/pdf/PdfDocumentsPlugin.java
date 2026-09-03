package com.yoyopdf.app.pdf;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader;
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONException;
import org.json.JSONArray;

@CapacitorPlugin(name = "PdfDocuments")
public final class PdfDocumentsPlugin extends Plugin {
    private final AtomicBoolean cancelRequested = new AtomicBoolean(false);
    private final AtomicBoolean mergeRunning = new AtomicBoolean(false);
    private final AtomicBoolean splitCancelRequested = new AtomicBoolean(false);
    private final AtomicBoolean splitRunning = new AtomicBoolean(false);
    private final AtomicBoolean reorderCancelRequested = new AtomicBoolean(false);
    private final AtomicBoolean reorderRunning = new AtomicBoolean(false);
    private final AtomicBoolean deleteCancelRequested = new AtomicBoolean(false);
    private final AtomicBoolean deleteRunning = new AtomicBoolean(false);
    private ExecutorService executor;
    private PdfMergeEngine mergeEngine;
    private PdfSplitEngine splitEngine;
    private PdfReorderEngine reorderEngine;
    private PdfDeleteEngine deleteEngine;

    @Override
    public void load() {
        PDFBoxResourceLoader.init(getContext());
        executor = Executors.newSingleThreadExecutor();
        mergeEngine = new PdfMergeEngine();
        splitEngine = new PdfSplitEngine();
        reorderEngine = new PdfReorderEngine();
        deleteEngine = new PdfDeleteEngine();
        cleanupOldMergeFiles();
        cleanupOldSplitFiles();
        cleanupOldReorderFiles();
        cleanupOldDeleteFiles();
    }

    @Override
    protected void handleOnDestroy() {
        cancelRequested.set(true);
        splitCancelRequested.set(true);
        reorderCancelRequested.set(true);
        deleteCancelRequested.set(true);
        if (executor != null) executor.shutdownNow();
    }

    @PluginMethod
    public void pickPdfs(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        boolean multiple = call.getBoolean("multiple", true);
        call.getData().put("inspectPageCount", !multiple);
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "pickPdfsResult");
    }

    @ActivityCallback
    private void pickPdfsResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject response = new JSObject();
            response.put("cancelled", true);
            response.put("files", new JSArray());
            response.put("duplicates", 0);
            call.resolve(response);
            return;
        }

        Intent data = result.getData();
        List<Uri> selectedUris = collectUris(data);
        int duplicateCount = countDuplicates(data);
        int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

        executor.execute(() -> {
            JSArray files = new JSArray();
            JSArray rejected = new JSArray();
            for (Uri uri : selectedUris) {
                takeReadPermission(uri, flags);
                try {
                    files.put(inspectSelectedPdf(uri, call.getBoolean("inspectPageCount", false)));
                } catch (PdfMergeException error) {
                    JSObject item = new JSObject();
                    item.put("name", queryName(uri));
                    item.put("code", error.getCode());
                    rejected.put(item);
                }
            }
            JSObject response = new JSObject();
            response.put("cancelled", false);
            response.put("files", files);
            response.put("rejected", rejected);
            response.put("duplicates", duplicateCount);
            call.resolve(response);
        });
    }

    @PluginMethod
    public void mergePdfs(PluginCall call) {
        List<Uri> sources;
        try {
            sources = parseContentUris(call.getArray("uris"));
        } catch (PdfMergeException error) {
            call.reject(error.getMessage(), error.getCode());
            return;
        }
        if (sources.size() < 2) {
            call.reject("Choose at least two PDF files.", "TOO_FEW_FILES");
            return;
        }
        if (splitRunning.get() || reorderRunning.get() || deleteRunning.get() || !mergeRunning.compareAndSet(false, true)) {
            call.reject("Another PDF operation is already running.", "BUSY");
            return;
        }

        cancelRequested.set(false);
        String requestedName = safeOutputName(call.getString("suggestedName", "merged-pdf.pdf"));
        File tempFile = new File(mergeCacheDirectory(), "merge-" + UUID.randomUUID() + ".pdf");
        call.getData().put("mergeTempPath", tempFile.getAbsolutePath());
        call.getData().put("mergeOutputName", requestedName);

        executor.execute(() -> {
            try {
                notifyPhase("merging", "Combining PDFs on this device.");
                int pageCount = mergeEngine.merge(getContext(), sources, tempFile, cancelRequested, (completed, total) -> {
                    JSObject progress = new JSObject();
                    progress.put("phase", "merging");
                    progress.put("completed", completed);
                    progress.put("total", total);
                    progress.put("message", completed + " of " + total + " PDFs combined");
                    notifyListeners("mergeProgress", progress);
                });
                call.getData().put("mergePageCount", pageCount);
                if (cancelRequested.get()) throw new PdfMergeException("CANCELLED", "The merge was cancelled.");
                notifyPhase("awaitingSave", "Choose where to save the merged PDF.");
                getActivity().runOnUiThread(() -> launchSavePicker(call, requestedName));
            } catch (PdfMergeException error) {
                finishFailedMerge(call, tempFile, error);
            } catch (RuntimeException error) {
                finishFailedMerge(call, tempFile, new PdfMergeException("UNEXPECTED_ERROR", "An unexpected error stopped the merge.", error));
            }
        });
    }

    @ActivityCallback
    private void saveMergedPdfResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            mergeRunning.set(false);
            return;
        }
        File tempFile = new File(call.getString("mergeTempPath", ""));
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            deleteQuietly(tempFile);
            mergeRunning.set(false);
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }

        Intent data = result.getData();
        Uri outputUri = data.getData();
        int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        takeWritePermission(outputUri, flags);
        notifyPhase("saving", "Saving the merged PDF.");

        executor.execute(() -> {
            try {
                copyToDocument(tempFile, outputUri);
                DocumentInfo info = queryDocument(outputUri);
                JSObject response = new JSObject();
                response.put("cancelled", false);
                response.put("uri", outputUri.toString());
                response.put("name", info.name);
                response.put("size", info.size);
                response.put("pageCount", call.getInt("mergePageCount", 0));
                response.put("createdAt", System.currentTimeMillis());
                response.put("operation", "merge");
                call.resolve(response);
            } catch (SecurityException error) {
                call.reject("The selected save location is not accessible.", "INACCESSIBLE_OUTPUT");
            } catch (IOException error) {
                String code = isOutOfSpace(error) ? "INSUFFICIENT_STORAGE" : "SAVE_FAILED";
                String message = isOutOfSpace(error)
                    ? "There is not enough free storage to save the merged PDF."
                    : "The merged PDF could not be saved at that location.";
                call.reject(message, code);
            } finally {
                deleteQuietly(tempFile);
                cancelRequested.set(false);
                mergeRunning.set(false);
            }
        });
    }

    @PluginMethod
    public void cancelMerge(PluginCall call) {
        boolean requested = mergeRunning.get();
        if (requested) cancelRequested.set(true);
        JSObject result = new JSObject();
        result.put("requested", requested);
        call.resolve(result);
    }

    @PluginMethod
    public void splitPdf(PluginCall call) {
        Uri source;
        List<List<Integer>> groups;
        try {
            source = requireContentUri(call.getString("uri"));
            groups = parsePageGroups(call.getArray("groups"));
        } catch (PdfSplitException error) {
            call.reject(error.getMessage(), error.getCode());
            return;
        } catch (PdfMergeException error) {
            call.reject(error.getMessage(), error.getCode());
            return;
        }
        if (mergeRunning.get() || reorderRunning.get() || deleteRunning.get() || !splitRunning.compareAndSet(false, true)) {
            call.reject("Another PDF operation is already running.", "BUSY");
            return;
        }

        splitCancelRequested.set(false);
        File operationDirectory = new File(splitCacheDirectory(), "split-" + UUID.randomUUID());
        call.getData().put("splitDirectory", operationDirectory.getAbsolutePath());
        String sourceName = call.getString("sourceName", "document.pdf");

        executor.execute(() -> {
            try {
                notifySplitPhase("splitting", "Creating split PDF files on this device.");
                PdfSplitEngine.Result splitResult = splitEngine.split(
                    getContext(),
                    source,
                    groups,
                    operationDirectory,
                    sourceName,
                    splitCancelRequested,
                    (completed, total) -> {
                        JSObject progress = new JSObject();
                        progress.put("phase", "splitting");
                        progress.put("completed", completed);
                        progress.put("total", total);
                        progress.put("message", completed + " of " + total + " output PDFs created");
                        notifyListeners("splitProgress", progress);
                    }
                );
                call.getData().put("splitTempPath", splitResult.getFile().getAbsolutePath());
                call.getData().put("splitOutputName", splitResult.getName());
                call.getData().put("splitMimeType", splitResult.getMimeType());
                call.getData().put("splitOutputCount", splitResult.getOutputCount());
                call.getData().put("splitPageCount", splitResult.getPageCount());
                if (splitCancelRequested.get()) throw new PdfSplitException("CANCELLED", "The split was cancelled.");
                notifySplitPhase("awaitingSave", "Choose where to save the split output.");
                getActivity().runOnUiThread(() -> launchSplitSavePicker(call, splitResult));
            } catch (PdfSplitException error) {
                finishFailedSplit(call, operationDirectory, error);
            } catch (RuntimeException error) {
                finishFailedSplit(call, operationDirectory, new PdfSplitException("UNEXPECTED_ERROR", "An unexpected error stopped the split.", error));
            }
        });
    }

    @ActivityCallback
    private void saveSplitResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            splitRunning.set(false);
            return;
        }
        File operationDirectory = new File(call.getString("splitDirectory", ""));
        File tempFile = new File(call.getString("splitTempPath", ""));
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            deleteRecursively(operationDirectory);
            splitRunning.set(false);
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }

        Intent data = result.getData();
        Uri outputUri = data.getData();
        int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        takeWritePermission(outputUri, flags);
        notifySplitPhase("saving", "Saving the split output.");
        executor.execute(() -> {
            try {
                copyToDocument(tempFile, outputUri);
                DocumentInfo info = queryDocument(outputUri);
                JSObject response = new JSObject();
                response.put("cancelled", false);
                response.put("uri", outputUri.toString());
                response.put("name", info.name);
                response.put("size", info.size);
                response.put("mimeType", call.getString("splitMimeType", "application/pdf"));
                response.put("outputCount", call.getInt("splitOutputCount", 1));
                response.put("pageCount", call.getInt("splitPageCount", 0));
                response.put("createdAt", System.currentTimeMillis());
                response.put("operation", "split");
                call.resolve(response);
            } catch (SecurityException error) {
                call.reject("The selected save location is not accessible.", "INACCESSIBLE_OUTPUT");
            } catch (IOException error) {
                String code = isOutOfSpace(error) ? "INSUFFICIENT_STORAGE" : "SAVE_FAILED";
                String message = isOutOfSpace(error)
                    ? "There is not enough free storage to save the split output."
                    : "The split output could not be saved at that location.";
                call.reject(message, code);
            } finally {
                deleteRecursively(operationDirectory);
                splitCancelRequested.set(false);
                splitRunning.set(false);
            }
        });
    }

    @PluginMethod
    public void cancelSplit(PluginCall call) {
        boolean requested = splitRunning.get();
        if (requested) splitCancelRequested.set(true);
        JSObject result = new JSObject();
        result.put("requested", requested);
        call.resolve(result);
    }

    @PluginMethod
    public void reorderPages(PluginCall call) {
        Uri source;
        List<Integer> order;
        try {
            source = requireContentUri(call.getString("uri"));
            order = parsePageOrder(call.getArray("order"));
        } catch (PdfMergeException error) {
            call.reject(error.getMessage(), error.getCode());
            return;
        } catch (PdfReorderException error) {
            call.reject(error.getMessage(), error.getCode());
            return;
        }
        if (mergeRunning.get() || splitRunning.get() || deleteRunning.get() || !reorderRunning.compareAndSet(false, true)) {
            call.reject("Another PDF operation is already running.", "BUSY");
            return;
        }

        reorderCancelRequested.set(false);
        File tempFile = new File(reorderCacheDirectory(), "reorder-" + UUID.randomUUID() + ".pdf");
        String outputName = safeReorderOutputName(call.getString("sourceName", "document.pdf"));
        call.getData().put("reorderTempPath", tempFile.getAbsolutePath());
        call.getData().put("reorderOutputName", outputName);
        executor.execute(() -> {
            try {
                notifyReorderPhase("reordering", "Copying pages in the selected order.");
                int pageCount = reorderEngine.reorder(getContext(), source, order, tempFile, reorderCancelRequested, (completed, total) -> {
                    JSObject progress = new JSObject();
                    progress.put("phase", "reordering");
                    progress.put("completed", completed);
                    progress.put("total", total);
                    progress.put("message", completed + " of " + total + " pages copied");
                    notifyListeners("reorderProgress", progress);
                });
                call.getData().put("reorderPageCount", pageCount);
                if (reorderCancelRequested.get()) throw new PdfReorderException("CANCELLED", "The reorder was cancelled.");
                notifyReorderPhase("awaitingSave", "Choose where to save the reordered PDF.");
                getActivity().runOnUiThread(() -> launchReorderSavePicker(call, outputName));
            } catch (PdfReorderException error) {
                finishFailedReorder(call, tempFile, error);
            } catch (RuntimeException error) {
                finishFailedReorder(call, tempFile, new PdfReorderException("UNEXPECTED_ERROR", "An unexpected error stopped the reorder.", error));
            }
        });
    }

    @ActivityCallback
    private void saveReorderedPdfResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            reorderRunning.set(false);
            return;
        }
        File tempFile = new File(call.getString("reorderTempPath", ""));
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            deleteQuietly(tempFile);
            reorderCancelRequested.set(false);
            reorderRunning.set(false);
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }

        Intent data = result.getData();
        Uri outputUri = data.getData();
        int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        takeWritePermission(outputUri, flags);
        notifyReorderPhase("saving", "Saving the reordered PDF.");
        executor.execute(() -> {
            try {
                copyToDocument(tempFile, outputUri);
                DocumentInfo info = queryDocument(outputUri);
                JSObject response = new JSObject();
                response.put("cancelled", false);
                response.put("uri", outputUri.toString());
                response.put("name", info.name);
                response.put("size", info.size);
                response.put("mimeType", "application/pdf");
                response.put("pageCount", call.getInt("reorderPageCount", 0));
                response.put("createdAt", System.currentTimeMillis());
                response.put("operation", "reorder");
                call.resolve(response);
            } catch (SecurityException error) {
                call.reject("The selected save location is not accessible.", "INACCESSIBLE_OUTPUT");
            } catch (IOException error) {
                String code = isOutOfSpace(error) ? "INSUFFICIENT_STORAGE" : "SAVE_FAILED";
                String message = isOutOfSpace(error)
                    ? "There is not enough free storage to save the reordered PDF."
                    : "The reordered PDF could not be saved at that location.";
                call.reject(message, code);
            } finally {
                deleteQuietly(tempFile);
                reorderCancelRequested.set(false);
                reorderRunning.set(false);
            }
        });
    }

    @PluginMethod
    public void cancelReorder(PluginCall call) {
        boolean requested = reorderRunning.get();
        if (requested) reorderCancelRequested.set(true);
        JSObject result = new JSObject();
        result.put("requested", requested);
        call.resolve(result);
    }

    @PluginMethod
    public void deletePages(PluginCall call) {
        Uri source;
        List<Integer> pages;
        try {
            source = requireContentUri(call.getString("uri"));
            pages = parseDeletedPages(call.getArray("pages"));
        } catch (PdfMergeException error) {
            call.reject(error.getMessage(), error.getCode());
            return;
        } catch (PdfDeleteException error) {
            call.reject(error.getMessage(), error.getCode());
            return;
        }
        if (mergeRunning.get() || splitRunning.get() || reorderRunning.get() || !deleteRunning.compareAndSet(false, true)) {
            call.reject("Another PDF operation is already running.", "BUSY");
            return;
        }

        deleteCancelRequested.set(false);
        File tempFile = new File(deleteCacheDirectory(), "delete-" + UUID.randomUUID() + ".pdf");
        String outputName = safeDeleteOutputName(call.getString("sourceName", "document.pdf"));
        call.getData().put("deleteTempPath", tempFile.getAbsolutePath());
        call.getData().put("deleteOutputName", outputName);
        call.getData().put("deleteCount", pages.size());
        executor.execute(() -> {
            try {
                notifyDeletePhase("deleting", "Creating a PDF without the selected pages.");
                int pageCount = deleteEngine.deletePages(getContext(), source, pages, tempFile, deleteCancelRequested, (completed, total) -> {
                    JSObject progress = new JSObject();
                    progress.put("phase", "deleting");
                    progress.put("completed", completed);
                    progress.put("total", total);
                    progress.put("message", completed + " of " + total + " remaining pages copied");
                    notifyListeners("deleteProgress", progress);
                });
                call.getData().put("deletePageCount", pageCount);
                if (deleteCancelRequested.get()) throw new PdfDeleteException("CANCELLED", "Page deletion was cancelled.");
                notifyDeletePhase("awaitingSave", "Choose where to save the updated PDF.");
                getActivity().runOnUiThread(() -> launchDeleteSavePicker(call, outputName));
            } catch (PdfDeleteException error) {
                finishFailedDelete(call, tempFile, error);
            } catch (RuntimeException error) {
                finishFailedDelete(call, tempFile, new PdfDeleteException("UNEXPECTED_ERROR", "An unexpected error stopped page deletion.", error));
            }
        });
    }

    @ActivityCallback
    private void saveDeletedPagesResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            deleteRunning.set(false);
            return;
        }
        File tempFile = new File(call.getString("deleteTempPath", ""));
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            deleteQuietly(tempFile);
            deleteCancelRequested.set(false);
            deleteRunning.set(false);
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }

        Intent data = result.getData();
        Uri outputUri = data.getData();
        int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        takeWritePermission(outputUri, flags);
        notifyDeletePhase("saving", "Saving the updated PDF.");
        executor.execute(() -> {
            try {
                copyToDocument(tempFile, outputUri);
                DocumentInfo info = queryDocument(outputUri);
                JSObject response = new JSObject();
                response.put("cancelled", false);
                response.put("uri", outputUri.toString());
                response.put("name", info.name);
                response.put("size", info.size);
                response.put("mimeType", "application/pdf");
                response.put("pageCount", call.getInt("deletePageCount", 0));
                response.put("deletedCount", call.getInt("deleteCount", 0));
                response.put("createdAt", System.currentTimeMillis());
                response.put("operation", "delete");
                call.resolve(response);
            } catch (SecurityException error) {
                call.reject("The selected save location is not accessible.", "INACCESSIBLE_OUTPUT");
            } catch (IOException error) {
                String code = isOutOfSpace(error) ? "INSUFFICIENT_STORAGE" : "SAVE_FAILED";
                String message = isOutOfSpace(error)
                    ? "There is not enough free storage to save the updated PDF."
                    : "The updated PDF could not be saved at that location.";
                call.reject(message, code);
            } finally {
                deleteQuietly(tempFile);
                deleteCancelRequested.set(false);
                deleteRunning.set(false);
            }
        });
    }

    @PluginMethod
    public void cancelDelete(PluginCall call) {
        boolean requested = deleteRunning.get();
        if (requested) deleteCancelRequested.set(true);
        JSObject result = new JSObject();
        result.put("requested", requested);
        call.resolve(result);
    }

    @PluginMethod
    public void renderPdfPage(PluginCall call) {
        Uri uri;
        int pageNumber = call.getInt("page", 0);
        int requestedWidth = call.getInt("maxWidth", 180);
        try {
            uri = requireContentUri(call.getString("uri"));
        } catch (PdfMergeException error) {
            call.reject(error.getMessage(), error.getCode());
            return;
        }
        if (pageNumber < 1) {
            call.reject("The requested page number is invalid.", "RANGE_OUT_OF_BOUNDS");
            return;
        }
        final int maxWidth = Math.max(80, Math.min(320, requestedWidth));
        executor.execute(() -> {
            Bitmap bitmap = null;
            try (
                ParcelFileDescriptor descriptor = getContext().getContentResolver().openFileDescriptor(uri, "r");
                PdfRenderer renderer = descriptor == null ? null : new PdfRenderer(descriptor)
            ) {
                if (renderer == null) throw new IOException("Document provider returned no file descriptor.");
                if (pageNumber > renderer.getPageCount()) throw new IllegalArgumentException("Page is outside the PDF.");
                try (PdfRenderer.Page page = renderer.openPage(pageNumber - 1)) {
                    int height = Math.max(1, Math.round(maxWidth * (page.getHeight() / (float) page.getWidth())));
                    bitmap = Bitmap.createBitmap(maxWidth, height, Bitmap.Config.ARGB_8888);
                    bitmap.eraseColor(Color.WHITE);
                    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                }
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 76, bytes)) throw new IOException("Thumbnail encoding failed.");
                JSObject response = new JSObject();
                response.put("dataUrl", "data:image/jpeg;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP));
                call.resolve(response);
            } catch (SecurityException error) {
                call.reject("Permission to preview this PDF was denied.", "INACCESSIBLE_FILE");
            } catch (IOException | IllegalArgumentException error) {
                call.reject("This page preview is unavailable.", "PREVIEW_UNAVAILABLE");
            } finally {
                if (bitmap != null) bitmap.recycle();
            }
        });
    }

    @PluginMethod
    public void getFileStatus(PluginCall call) {
        Uri uri;
        try {
            uri = requireContentUri(call.getString("uri"));
        } catch (PdfMergeException error) {
            call.reject(error.getMessage(), error.getCode());
            return;
        }
        executor.execute(() -> {
            JSObject response = new JSObject();
            try (android.content.res.AssetFileDescriptor descriptor = getContext().getContentResolver().openAssetFileDescriptor(uri, "r")) {
                DocumentInfo info = queryDocument(uri);
                response.put("available", descriptor != null);
                response.put("name", info.name);
                response.put("size", info.size);
            } catch (Exception error) {
                response.put("available", false);
            }
            call.resolve(response);
        });
    }

    @PluginMethod
    public void openPdf(PluginCall call) {
        Uri uri;
        try {
            uri = requireContentUri(call.getString("uri"));
            ensureDocumentAvailable(uri);
        } catch (PdfMergeException error) {
            call.reject(error.getMessage(), error.getCode());
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, documentMimeType(uri));
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.setClipData(ClipData.newUri(getContext().getContentResolver(), "YOYOPDF document", uri));
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (RuntimeException error) {
            call.reject("No installed app can open this file.", "OPEN_UNAVAILABLE");
        }
    }

    @PluginMethod
    public void sharePdf(PluginCall call) {
        Uri uri;
        try {
            uri = requireContentUri(call.getString("uri"));
            ensureDocumentAvailable(uri);
        } catch (PdfMergeException error) {
            call.reject(error.getMessage(), error.getCode());
            return;
        }
        Intent share = new Intent(Intent.ACTION_SEND);
        share.setType(documentMimeType(uri));
        share.putExtra(Intent.EXTRA_STREAM, uri);
        share.setClipData(ClipData.newUri(getContext().getContentResolver(), "YOYOPDF document", uri));
        share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            getActivity().startActivity(Intent.createChooser(share, "Share file"));
            call.resolve();
        } catch (RuntimeException error) {
            call.reject("The Android share sheet is unavailable.", "SHARE_UNAVAILABLE");
        }
    }

    private void launchSavePicker(PluginCall call, String requestedName) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        intent.putExtra(Intent.EXTRA_TITLE, requestedName);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            startActivityForResult(call, intent, "saveMergedPdfResult");
        } catch (RuntimeException error) {
            finishFailedMerge(call, new File(call.getString("mergeTempPath", "")), new PdfMergeException("SAVE_UNAVAILABLE", "No document provider is available for saving PDFs.", error));
        }
    }

    private void launchSplitSavePicker(PluginCall call, PdfSplitEngine.Result result) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(result.getMimeType());
        intent.putExtra(Intent.EXTRA_TITLE, result.getName());
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            startActivityForResult(call, intent, "saveSplitResult");
        } catch (RuntimeException error) {
            finishFailedSplit(call, new File(call.getString("splitDirectory", "")), new PdfSplitException("SAVE_UNAVAILABLE", "No document provider is available for saving this output.", error));
        }
    }

    private void launchReorderSavePicker(PluginCall call, String outputName) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        intent.putExtra(Intent.EXTRA_TITLE, outputName);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            startActivityForResult(call, intent, "saveReorderedPdfResult");
        } catch (RuntimeException error) {
            finishFailedReorder(call, new File(call.getString("reorderTempPath", "")), new PdfReorderException("SAVE_UNAVAILABLE", "No document provider is available for saving PDFs.", error));
        }
    }

    private void launchDeleteSavePicker(PluginCall call, String outputName) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        intent.putExtra(Intent.EXTRA_TITLE, outputName);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            startActivityForResult(call, intent, "saveDeletedPagesResult");
        } catch (RuntimeException error) {
            finishFailedDelete(call, new File(call.getString("deleteTempPath", "")), new PdfDeleteException("SAVE_UNAVAILABLE", "No document provider is available for saving PDFs.", error));
        }
    }

    private void copyToDocument(File source, Uri destination) throws IOException {
        ContentResolver resolver = getContext().getContentResolver();
        try (InputStream input = new FileInputStream(source); OutputStream output = resolver.openOutputStream(destination, "w")) {
            if (output == null) throw new IOException("Document provider returned no output stream.");
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            output.flush();
        }
    }

    private JSObject inspectSelectedPdf(Uri uri, boolean includePageCount) throws PdfMergeException {
        DocumentInfo info = queryDocument(uri);
        try (InputStream raw = getContext().getContentResolver().openInputStream(uri); BufferedInputStream input = raw == null ? null : new BufferedInputStream(raw)) {
            if (input == null) throw new PdfMergeException("INACCESSIBLE_FILE", "A selected PDF cannot be opened.");
            byte[] header = new byte[5];
            if (input.read(header) != 5 || header[0] != '%' || header[1] != 'P' || header[2] != 'D' || header[3] != 'F' || header[4] != '-') {
                throw new PdfMergeException("INVALID_PDF", "A selected file is not a valid PDF.");
            }
        } catch (PdfMergeException error) {
            throw error;
        } catch (IOException | SecurityException error) {
            throw new PdfMergeException("INACCESSIBLE_FILE", "A selected PDF cannot be read.", error);
        }
        JSObject item = new JSObject();
        item.put("id", uri.toString());
        item.put("uri", uri.toString());
        item.put("name", info.name);
        item.put("size", info.size);
        item.put("mimeType", "application/pdf");
        item.put("available", true);
        if (includePageCount) item.put("pageCount", inspectPageCount(uri));
        return item;
    }

    private int inspectPageCount(Uri uri) throws PdfMergeException {
        try (InputStream input = getContext().getContentResolver().openInputStream(uri)) {
            if (input == null) throw new PdfMergeException("INACCESSIBLE_FILE", "The selected PDF cannot be opened.");
            try (com.tom_roush.pdfbox.pdmodel.PDDocument document = com.tom_roush.pdfbox.pdmodel.PDDocument.load(input, com.tom_roush.pdfbox.io.MemoryUsageSetting.setupTempFileOnly())) {
                int pageCount = document.getNumberOfPages();
                if (pageCount < 1) throw new PdfMergeException("INVALID_PDF", "The selected PDF contains no pages.");
                return pageCount;
            }
        } catch (com.tom_roush.pdfbox.pdmodel.encryption.InvalidPasswordException error) {
            throw new PdfMergeException("ENCRYPTED_PDF", "The selected PDF is password-protected.", error);
        } catch (PdfMergeException error) {
            throw error;
        } catch (SecurityException error) {
            throw new PdfMergeException("INACCESSIBLE_FILE", "Permission to read the selected PDF was denied.", error);
        } catch (IOException error) {
            throw new PdfMergeException("CORRUPTED_PDF", "The selected PDF is damaged or incomplete.", error);
        }
    }

    private List<Uri> collectUris(Intent data) {
        Set<String> unique = new LinkedHashSet<>();
        List<Uri> result = new ArrayList<>();
        ClipData clip = data.getClipData();
        if (clip != null) {
            for (int index = 0; index < clip.getItemCount(); index += 1) {
                Uri uri = clip.getItemAt(index).getUri();
                if (uri != null && unique.add(uri.toString())) result.add(uri);
            }
        } else if (data.getData() != null) {
            result.add(data.getData());
        }
        return result;
    }

    private int countDuplicates(Intent data) {
        ClipData clip = data.getClipData();
        if (clip == null) return 0;
        Set<String> unique = new LinkedHashSet<>();
        for (int index = 0; index < clip.getItemCount(); index += 1) {
            Uri uri = clip.getItemAt(index).getUri();
            if (uri != null) unique.add(uri.toString());
        }
        return clip.getItemCount() - unique.size();
    }

    private List<Uri> parseContentUris(JSArray values) throws PdfMergeException {
        if (values == null) throw new PdfMergeException("NO_FILES", "No PDF files were provided.");
        List<Uri> uris = new ArrayList<>();
        Set<String> unique = new LinkedHashSet<>();
        try {
            for (int index = 0; index < values.length(); index += 1) {
                Uri uri = requireContentUri(values.getString(index));
                if (unique.add(uri.toString())) uris.add(uri);
            }
        } catch (JSONException error) {
            throw new PdfMergeException("INVALID_URI", "A selected PDF reference is invalid.", error);
        }
        return uris;
    }

    private List<List<Integer>> parsePageGroups(JSArray values) throws PdfSplitException {
        if (values == null || values.length() == 0) throw new PdfSplitException("NO_PAGES_SELECTED", "No pages were provided.");
        List<List<Integer>> groups = new ArrayList<>();
        Set<Integer> allPages = new LinkedHashSet<>();
        try {
            for (int groupIndex = 0; groupIndex < values.length(); groupIndex += 1) {
                JSONArray pageValues = values.getJSONArray(groupIndex);
                if (pageValues.length() == 0) throw new PdfSplitException("NO_PAGES_SELECTED", "An output contains no pages.");
                List<Integer> pages = new ArrayList<>();
                for (int pageIndex = 0; pageIndex < pageValues.length(); pageIndex += 1) {
                    int page = pageValues.getInt(pageIndex);
                    if (page < 1) throw new PdfSplitException("RANGE_OUT_OF_BOUNDS", "Page numbers must start at 1.");
                    if (!allPages.add(page)) throw new PdfSplitException("OVERLAPPING_RANGES", "Page ranges cannot overlap or repeat pages.");
                    pages.add(page);
                }
                groups.add(pages);
            }
        } catch (JSONException error) {
            throw new PdfSplitException("INVALID_RANGE", "The requested page ranges are invalid.", error);
        }
        return groups;
    }

    private List<Integer> parsePageOrder(JSArray values) throws PdfReorderException {
        if (values == null || values.length() == 0) throw new PdfReorderException("EMPTY_PAGE_ORDER", "At least one page must remain.");
        List<Integer> order = new ArrayList<>();
        Set<Integer> unique = new LinkedHashSet<>();
        try {
            for (int index = 0; index < values.length(); index += 1) {
                int page = values.getInt(index);
                if (page < 1 || !unique.add(page)) {
                    throw new PdfReorderException("INVALID_PAGE_ORDER", "The page order contains an invalid or duplicate page.");
                }
                order.add(page);
            }
        } catch (JSONException error) {
            throw new PdfReorderException("INVALID_PAGE_ORDER", "The page order is invalid.", error);
        }
        return order;
    }

    private List<Integer> parseDeletedPages(JSArray values) throws PdfDeleteException {
        if (values == null || values.length() == 0) throw new PdfDeleteException("NO_PAGES_SELECTED", "Select pages to delete.");
        List<Integer> pages = new ArrayList<>();
        Set<Integer> unique = new LinkedHashSet<>();
        try {
            for (int index = 0; index < values.length(); index += 1) {
                int page = values.getInt(index);
                if (page < 1 || !unique.add(page)) {
                    throw new PdfDeleteException("INVALID_PAGE_INDEX", "The deletion selection contains an invalid or duplicate page.");
                }
                pages.add(page);
            }
        } catch (JSONException error) {
            throw new PdfDeleteException("INVALID_PAGE_INDEX", "The deletion selection is invalid.", error);
        }
        return pages;
    }

    private Uri requireContentUri(String value) throws PdfMergeException {
        if (value == null || value.trim().isEmpty()) throw new PdfMergeException("INVALID_URI", "The PDF reference is missing.");
        Uri uri = Uri.parse(value);
        if (!ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())) {
            throw new PdfMergeException("INVALID_URI", "Only secure Android document references are supported.");
        }
        return uri;
    }

    private void ensureDocumentAvailable(Uri uri) throws PdfMergeException {
        try (android.content.res.AssetFileDescriptor descriptor = getContext().getContentResolver().openAssetFileDescriptor(uri, "r")) {
            if (descriptor == null) throw new PdfMergeException("INACCESSIBLE_FILE", "The saved PDF is no longer available.");
        } catch (PdfMergeException error) {
            throw error;
        } catch (IOException | SecurityException error) {
            throw new PdfMergeException("INACCESSIBLE_FILE", "The saved PDF is no longer available.", error);
        }
    }

    private DocumentInfo queryDocument(Uri uri) {
        String fallbackName = "document.pdf";
        long size = -1;
        try (Cursor cursor = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (nameIndex >= 0 && !cursor.isNull(nameIndex)) fallbackName = cursor.getString(nameIndex);
                if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) size = cursor.getLong(sizeIndex);
            }
        } catch (RuntimeException ignored) {
            // Availability is verified by opening the stream, not metadata lookup.
        }
        return new DocumentInfo(fallbackName, size);
    }

    private String queryName(Uri uri) {
        return queryDocument(uri).name;
    }

    private String documentMimeType(Uri uri) {
        try {
            String type = getContext().getContentResolver().getType(uri);
            if (type != null && !type.trim().isEmpty()) return type;
        } catch (RuntimeException ignored) {
            // Fall back to the display-name extension below.
        }
        return queryName(uri).toLowerCase(Locale.ROOT).endsWith(".zip") ? "application/zip" : "application/pdf";
    }

    private void takeReadPermission(Uri uri, int flags) {
        try {
            getContext().getContentResolver().takePersistableUriPermission(uri, flags & Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (RuntimeException ignored) {
            // Some providers grant session access but do not support persistable grants.
        }
    }

    private void takeWritePermission(Uri uri, int flags) {
        try {
            getContext().getContentResolver().takePersistableUriPermission(uri, flags);
        } catch (RuntimeException ignored) {
            // The newly created document remains available for the current session.
        }
    }

    private File mergeCacheDirectory() {
        File directory = new File(getContext().getCacheDir(), "pdf-merge");
        if (!directory.exists()) directory.mkdirs();
        return directory;
    }

    private File splitCacheDirectory() {
        File directory = new File(getContext().getCacheDir(), "pdf-split");
        if (!directory.exists()) directory.mkdirs();
        return directory;
    }

    private File reorderCacheDirectory() {
        File directory = new File(getContext().getCacheDir(), "pdf-reorder");
        if (!directory.exists()) directory.mkdirs();
        return directory;
    }

    private File deleteCacheDirectory() {
        File directory = new File(getContext().getCacheDir(), "pdf-delete");
        if (!directory.exists()) directory.mkdirs();
        return directory;
    }

    private void cleanupOldMergeFiles() {
        File[] files = mergeCacheDirectory().listFiles();
        if (files == null) return;
        long cutoff = System.currentTimeMillis() - (24L * 60L * 60L * 1000L);
        for (File file : files) {
            if (file.lastModified() < cutoff) deleteQuietly(file);
        }
    }

    private void cleanupOldSplitFiles() {
        File[] files = splitCacheDirectory().listFiles();
        if (files == null) return;
        long cutoff = System.currentTimeMillis() - (24L * 60L * 60L * 1000L);
        for (File file : files) {
            if (file.lastModified() < cutoff) deleteRecursively(file);
        }
    }

    private void cleanupOldReorderFiles() {
        File[] files = reorderCacheDirectory().listFiles();
        if (files == null) return;
        long cutoff = System.currentTimeMillis() - (24L * 60L * 60L * 1000L);
        for (File file : files) {
            if (file.lastModified() < cutoff) deleteQuietly(file);
        }
    }

    private void cleanupOldDeleteFiles() {
        File[] files = deleteCacheDirectory().listFiles();
        if (files == null) return;
        long cutoff = System.currentTimeMillis() - (24L * 60L * 60L * 1000L);
        for (File file : files) {
            if (file.lastModified() < cutoff) deleteQuietly(file);
        }
    }

    private void notifyPhase(String phase, String message) {
        JSObject progress = new JSObject();
        progress.put("phase", phase);
        progress.put("message", message);
        notifyListeners("mergeProgress", progress);
    }

    private void notifySplitPhase(String phase, String message) {
        JSObject progress = new JSObject();
        progress.put("phase", phase);
        progress.put("message", message);
        notifyListeners("splitProgress", progress);
    }

    private void notifyReorderPhase(String phase, String message) {
        JSObject progress = new JSObject();
        progress.put("phase", phase);
        progress.put("message", message);
        notifyListeners("reorderProgress", progress);
    }

    private void notifyDeletePhase(String phase, String message) {
        JSObject progress = new JSObject();
        progress.put("phase", phase);
        progress.put("message", message);
        notifyListeners("deleteProgress", progress);
    }

    private void finishFailedMerge(PluginCall call, File tempFile, PdfMergeException error) {
        deleteQuietly(tempFile);
        cancelRequested.set(false);
        mergeRunning.set(false);
        call.reject(error.getMessage(), error.getCode());
    }

    private void finishFailedSplit(PluginCall call, File operationDirectory, PdfSplitException error) {
        deleteRecursively(operationDirectory);
        splitCancelRequested.set(false);
        splitRunning.set(false);
        call.reject(error.getMessage(), error.getCode());
    }

    private void finishFailedReorder(PluginCall call, File tempFile, PdfReorderException error) {
        deleteQuietly(tempFile);
        reorderCancelRequested.set(false);
        reorderRunning.set(false);
        call.reject(error.getMessage(), error.getCode());
    }

    private void finishFailedDelete(PluginCall call, File tempFile, PdfDeleteException error) {
        deleteQuietly(tempFile);
        deleteCancelRequested.set(false);
        deleteRunning.set(false);
        call.reject(error.getMessage(), error.getCode());
    }

    private static void deleteQuietly(File file) {
        if (file != null && file.exists()) file.delete();
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        File[] children = file.listFiles();
        if (children != null) {
            for (File child : children) deleteRecursively(child);
        }
        file.delete();
    }

    private static String safeOutputName(String value) {
        String normalized = value == null ? "merged-pdf.pdf" : value.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-").trim();
        if (normalized.isEmpty()) normalized = "merged-pdf.pdf";
        if (!normalized.toLowerCase(Locale.ROOT).endsWith(".pdf")) normalized += ".pdf";
        return normalized.length() > 80 ? normalized.substring(0, 76) + ".pdf" : normalized;
    }

    private static String safeReorderOutputName(String sourceName) {
        String normalized = sourceName == null ? "document" : sourceName.replaceAll("(?i)\\.pdf$", "");
        normalized = normalized.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-").trim();
        if (normalized.isEmpty()) normalized = "document";
        String output = normalized + "_reordered.pdf";
        return output.length() > 80 ? output.substring(0, 76) + ".pdf" : output;
    }

    private static String safeDeleteOutputName(String sourceName) {
        String normalized = sourceName == null ? "document" : sourceName.replaceAll("(?i)\\.pdf$", "");
        normalized = normalized.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-").trim();
        if (normalized.isEmpty()) normalized = "document";
        String output = normalized + "_pages_removed.pdf";
        return output.length() > 80 ? output.substring(0, 76) + ".pdf" : output;
    }

    private static boolean isOutOfSpace(Throwable error) {
        Throwable cursor = error;
        while (cursor != null) {
            String message = cursor.getMessage();
            if (message != null) {
                String normalizedMessage = message.toLowerCase(Locale.ROOT);
                if (normalizedMessage.contains("no space left") || normalizedMessage.contains("enospc")) return true;
            }
            cursor = cursor.getCause();
        }
        return false;
    }

    private static final class DocumentInfo {
        final String name;
        final long size;

        DocumentInfo(String name, long size) {
            this.name = name;
            this.size = size;
        }
    }
}
