// Starts Swagger UI on /docs with a version picker.
// The versions (v1, and v2 when it is built) come from versions.json, written by
// scripts/build-site.mjs. /docs/?version=v2 opens v2; the default is the first (v1).
// Kept in its own file (no inline script), so the page can use a strict Content-Security-Policy.
(async () => {
  let versions = [{ id: "v1", label: "v1", spec: "/openapi.json" }];
  try {
    const res = await fetch("./versions.json");
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length) versions = list;
    }
  } catch {
    // No versions.json: show v1 only.
  }

  const wanted = new URLSearchParams(location.search).get("version");
  const current = versions.find((v) => v.id === wanted) ?? versions[0];

  if (versions.length > 1) {
    const select = document.getElementById("api-version");
    for (const v of versions) select.add(new Option(v.label, v.id, false, v === current));
    select.addEventListener("change", () => {
      const params = new URLSearchParams(location.search);
      params.set("version", select.value);
      location.search = params.toString(); // reloads the page with the chosen version
    });
    document.getElementById("version-picker").hidden = false;
  }

  window.ui = SwaggerUIBundle({
    url: current.spec,
    dom_id: "#swagger-ui",
    deepLinking: true,
    docExpansion: "list",
    defaultModelsExpandDepth: 0,
    displayRequestDuration: true,
    tryItOutEnabled: true,
    supportedSubmitMethods: ["get", "head"],
    validatorUrl: null, // don't send the spec to swagger.io for validation
  });
})();
