import { create } from "zustand";

type CompFuncProps = { open: boolean; setOpen: (open: boolean) => void };
export type CompFuncType = (props: CompFuncProps) => React.ReactNode;

interface DialogStore {
  childFunc: CompFuncType | null;
  open: boolean;
  show: (childFunc: CompFuncType) => void;
  setOpen: (open: boolean) => void;
}

export const useDialogStore = create<DialogStore>((set) => ({
  childFunc: null,
  open: false,
  show: (childFunc) => set({ childFunc, open: true }),
  setOpen: (open) => set({ open }),
}));
