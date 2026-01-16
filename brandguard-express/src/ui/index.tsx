/// <reference lib="dom" />
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { DocumentSandboxApi } from "../models/DocumentSandboxApi";

import addOnUISdk, {
  RuntimeType,
} from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";

async function bootstrap() {
  await addOnUISdk.ready;
  console.log("addOnUISdk ready");

  const instance = addOnUISdk.instance;
  if (!instance || !instance.runtime) {
    throw new Error("Adobe Express runtime not available");
  }

  const sandboxProxy =
    (await instance.runtime.apiProxy?.(
      RuntimeType.documentSandbox
    )) as DocumentSandboxApi;

  if (!sandboxProxy) {
    throw new Error("Document sandbox proxy not available");
  }

  // TS-safe DOM access
  const container = document.getElementById("root") as HTMLElement | null;
  if (!container) {
    throw new Error("Root container not found");
  }

  const root = createRoot(container);
  root.render(
    <App addOnUISdk={addOnUISdk} sandboxProxy={sandboxProxy} />
  );
}

bootstrap().catch((err) => {
  console.error("Add-on bootstrap failed:", err);
});
