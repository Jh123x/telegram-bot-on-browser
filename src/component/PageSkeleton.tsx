import React from "react";
import { Box, Skeleton } from "@mui/material";
import type { Page } from "./Navbar.tsx";

// Suspense fallback shown while a lazy page chunk downloads. Each variant
// mirrors the target page's layout so swapping skeleton -> page does not
// shift the UI. Skeletons are decorative: the wrapper marks them as such and
// the real page replaces them as soon as its chunk has loaded.
const cardSx = {
  p: 2,
  border: 1,
  borderColor: "divider",
  borderRadius: 2,
} as const;

const FlowSkeleton = () => (
  <Box
    data-testid="page-skeleton-flow"
    sx={{ display: "flex", gap: 2, height: "100%", minHeight: 320 }}
    aria-hidden="true"
  >
    <Box
      data-testid="skeleton-rail"
      data-skeleton-region
      sx={{ width: 260, display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Box sx={cardSx}>
        <Skeleton variant="text" width="40%" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} variant="text" />
        ))}
      </Box>
      <Box sx={cardSx}>
        <Skeleton variant="text" width="50%" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} variant="text" />
        ))}
      </Box>
    </Box>
    <Box
      data-testid="skeleton-canvas"
      data-skeleton-region
      sx={{ flex: 1, minWidth: 0, ...cardSx, display: "flex" }}
    >
      <Skeleton variant="rounded" sx={{ flex: 1, width: "100%" }} />
    </Box>
    <Box
      data-testid="skeleton-inspector"
      data-skeleton-region
      sx={{ width: 280, ...cardSx }}
    >
      <Skeleton variant="text" width="50%" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} variant="text" />
      ))}
      <Skeleton variant="rounded" height={36} sx={{ mt: 2 }} />
    </Box>
  </Box>
);

const ChatSkeleton = () => (
  <Box
    data-testid="page-skeleton-chat"
    sx={{ display: "flex", gap: 2, height: "100%", minHeight: 320 }}
    aria-hidden="true"
  >
    <Box
      data-testid="skeleton-sidebar"
      data-skeleton-region
      sx={{ width: 240, ...cardSx }}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1.5 }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="40%" />
          </Box>
        </Box>
      ))}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        data-testid="skeleton-conversation"
        data-skeleton-region
        sx={{ flex: 1, ...cardSx, display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        <Skeleton variant="text" width="55%" sx={{ alignSelf: "flex-end" }} />
        <Skeleton variant="text" width="35%" sx={{ alignSelf: "flex-end" }} />
        <Skeleton variant="text" width="45%" />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="30%" sx={{ alignSelf: "flex-end" }} />
      </Box>
      <Box
        data-testid="skeleton-composer"
        data-skeleton-region
        sx={{ ...cardSx }}
      >
        <Skeleton variant="rounded" height={40} />
      </Box>
    </Box>
  </Box>
);

const SettingsSkeleton = () => (
  <Box
    data-testid="page-skeleton-settings"
    sx={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 2 }}
    aria-hidden="true"
  >
    <Skeleton variant="text" width={160} height={32} />
    {Array.from({ length: 4 }, (_, i) => (
      <Box key={i} data-testid={`skeleton-setting-row-${i + 1}`} sx={cardSx}>
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="rounded" height={40} sx={{ mt: 1 }} />
      </Box>
    ))}
  </Box>
);

const DocsSkeleton = () => (
  <Box
    data-testid="page-skeleton-docs"
    sx={{ maxWidth: "65ch", display: "flex", flexDirection: "column", gap: 2 }}
    aria-hidden="true"
  >
    <Skeleton data-testid="skeleton-docs-heading" variant="text" width="45%" height={40} />
    {Array.from({ length: 3 }, (_, i) => (
      <Box key={i}>
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" width="70%" />
      </Box>
    ))}
    <Skeleton data-testid="skeleton-docs-code" variant="rounded" height={80} />
    <Skeleton variant="text" width="85%" />
    <Skeleton variant="text" width="50%" />
  </Box>
);

const SKELETONS: Record<Page, React.ComponentType> = {
  flow: FlowSkeleton,
  chat: ChatSkeleton,
  settings: SettingsSkeleton,
  docs: DocsSkeleton,
};

export const PageSkeleton = ({ page }: { page: Page }) => {
  const SkeletonPage = SKELETONS[page];
  return (
    <Box data-testid="page-skeleton">
      <SkeletonPage />
    </Box>
  );
};
