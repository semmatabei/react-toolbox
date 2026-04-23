import { useDialogStore, type CompFuncType } from "./use-dialog";

// ---------------------------------------------------------------------------
// Portal (createRoot) vs Zustand — why Zustand wins for app code
//
// Portal approach:
//   - Renders into a detached DOM node via createRoot(), outside the React tree
//   - Works from anywhere — even plain JS outside React
//   - Downside: no access to app providers (theme, query client, auth, i18n, etc.)
//   - Each call creates a new React root; the old one is never unmounted → memory leak
//
// Zustand approach (this implementation):
//   - Dialog renders inside the app tree via <DialogPortal> mounted in the root layout
//   - Full access to all React contexts and providers
//   - callsite API is identical: ShowDialog(({ open, setOpen }) => <MyDialog ... />)
//   - Single active dialog at a time; SwapDialog replaces it
// ---------------------------------------------------------------------------

/** Mount once in your root layout. Renders the active dialog inside the React tree. */
export function DialogPortal() {
  const { childFunc, open, setOpen } = useDialogStore();
  if (!childFunc) return null;
  return <>{childFunc({ open, setOpen })}</>;
}

/** Open a dialog imperatively. The component renders inside the app tree via <DialogPortal>. */
export function ShowDialog(childFunc: CompFuncType) {
  useDialogStore.getState().show(childFunc);
}

/**
 * Alternative if prefer portal approach.
 */
// import { useState } from "react";
// import { createRoot } from "react-dom/client";

// type CompFuncProps = { open: boolean; setOpen: (open: boolean) => void };
// type CompFuncType = (props: CompFuncProps) => JSX.Element;

// type ModalContainerProps = {
//   childFunc: CompFuncType;
// };

// function ModalContainer({ childFunc }: ModalContainerProps) {
//   const [open, setOpen] = useState(true);
//   return childFunc({ open, setOpen });
// }

// const mountRootId = "portal-root";
// export async function ShowDialog(childFunc: CompFuncType): Promise<any> {
//   return new Promise(() => {
//     let mount = document.getElementById(mountRootId);
//     if (!mount) {
//       mount = document.createElement("div");
//       mount.setAttribute("id", mountRootId);
//       document.body.appendChild(mount);
//     }

//     createRoot(mount).render(<ModalContainer childFunc={childFunc} />);
//   });
// }
