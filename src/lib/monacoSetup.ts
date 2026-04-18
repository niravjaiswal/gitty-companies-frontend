import { loader } from '@monaco-editor/react';

// Silence semantic diagnostics globally. Monaco has no node_modules in the
// browser, so it flags every Node/npm global ('process', Express types, etc.)
// as missing. Real type checks run server-side via tsc in the remix pipeline.
loader.init().then((monaco) => {
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
});
