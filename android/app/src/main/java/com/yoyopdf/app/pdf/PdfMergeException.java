package com.yoyopdf.app.pdf;

public final class PdfMergeException extends Exception {
    private final String code;

    public PdfMergeException(String code, String message) {
        super(message);
        this.code = code;
    }

    public PdfMergeException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
