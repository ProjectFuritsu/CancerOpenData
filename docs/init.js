// Starts Swagger UI on /docs with the spec from /openapi.json.
// Kept in its own file (no inline script), so the page can use a strict Content-Security-Policy.
window.ui = SwaggerUIBundle({
  url: "/openapi.json",
  dom_id: "#swagger-ui",
  deepLinking: true,
  docExpansion: "list",
  defaultModelsExpandDepth: 0,
  displayRequestDuration: true,
  tryItOutEnabled: true,
  supportedSubmitMethods: ["get", "head"],
  validatorUrl: null, // don't send the spec to swagger.io for validation
});
