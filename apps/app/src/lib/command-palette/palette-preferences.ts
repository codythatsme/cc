import { createThreadArchiveFilterAtom } from "@/lib/thread-lifecycle-filter";

export const paletteThreadLifecyclesAtom = createThreadArchiveFilterAtom(
  "cc.palette.threadArchiveFilter",
);
