"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function GlowDot({ tone }: { tone: "success" | "warning" | "error" | "info" }) {
  return <span className={`v-toast-dot v-toast-dot--${tone}`} aria-hidden="true" />;
}

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      richColors={false}
      position="bottom-right"
      duration={4000}
      gap={10}
      icons={{
        success: <GlowDot tone="success" />,
        warning: <GlowDot tone="warning" />,
        error: <GlowDot tone="error" />,
        info: <GlowDot tone="info" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "v-toast",
          content: "v-toast-content",
          icon: "v-toast-icon",
          title: "v-toast-title",
          description: "v-toast-description",
          closeButton: "v-toast-close",
          actionButton: "v-toast-action",
          success: "v-toast--success",
          warning: "v-toast--warning",
          error: "v-toast--error",
          info: "v-toast--info",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
