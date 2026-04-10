import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDialogStore } from "./use-dialog";

type Options = {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
};

function ConfirmModal({ title, message, resolver, options }: { title: string; message: string; resolver: (result: boolean) => void; options?: Options }) {
  const setOpen = useDialogStore((s) => s.setOpen);
  const open = useDialogStore((s) => s.open);
  const variant = options?.variant ?? "default";

  const handleConfirm = () => {
    setOpen(false);
    resolver(true);
  };

  const handleCancel = () => {
    setOpen(false);
    resolver(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(v: boolean) => !v && handleCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} asChild>
            <Button variant={variant}>Konfirmasi</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export async function ShowConfirm(title: string, message: string, options?: Options): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogStore.getState().show(({ open: _open, setOpen: _setOpen }) => <ConfirmModal title={title} message={message} resolver={resolve} options={options} />);
  });
}

// ---------------------------------------------------------------------------
// Portal approach (previous implementation — kept for reference)
//
// import { useState } from "react";
// import { createRoot } from "react-dom/client";
//
// function ConfirmModal({ title, message, resolver, options }) {
//   const [open, setOpen] = useState(true);
//
//   const handleConfirm = () => { setOpen(false); resolver(true); };
//   const handleCancel = () => { setOpen(false); resolver(false); };
//   const variant = options?.variant ?? "default";
//
//   return (
//     <AlertDialog open={open} onOpenChange={setOpen}>
//       <AlertDialogContent>
//         <AlertDialogHeader>
//           <AlertDialogTitle>{title}</AlertDialogTitle>
//           <AlertDialogDescription>{message}</AlertDialogDescription>
//         </AlertDialogHeader>
//         <AlertDialogFooter>
//           <AlertDialogCancel onClick={handleCancel}>Batal</AlertDialogCancel>
//           <AlertDialogAction onClick={handleConfirm} asChild>
//             <Button variant={variant}>Konfirmasi</Button>
//           </AlertDialogAction>
//         </AlertDialogFooter>
//       </AlertDialogContent>
//     </AlertDialog>
//   );
// }
//
// const mountRootId = "confirm-root";
// export async function ShowConfirm(title, message, options) {
//   let mount = document.getElementById(mountRootId);
//   if (!mount) {
//     mount = document.createElement("div");
//     mount.setAttribute("id", mountRootId);
//     document.body.appendChild(mount);
//   }
//   return new Promise((resolve) => {
//     createRoot(mount).render(<ConfirmModal resolver={resolve} title={title} message={message} options={options} />);
//   });
// }
// ---------------------------------------------------------------------------
