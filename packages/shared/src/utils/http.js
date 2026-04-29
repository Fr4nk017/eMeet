export function badRequest(res, message) {
    return res.status(400).json({ error: message });
}
export function unauthorized(res, message = 'No autorizado') {
    return res.status(401).json({ error: message });
}
export function serverError(res, message = 'Error interno del servidor') {
    return res.status(500).json({ error: message });
}
//# sourceMappingURL=http.js.map