package com.yoyopdf.app.pdf;

public final class PdfReorderException extends Exception {
    private final String code;

    public PdfReorderException(String code, String message) {
        super(message);
        this.code = code;
    }

    public PdfReorderException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
