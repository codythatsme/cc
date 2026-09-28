import { useQuery } from "@tanstack/react-query";
import { Button } from "@bb/shared-ui/button";
import { sdk } from "@/lib/sdk";

export function AndroidTestingSection() {
  const build = useQuery({
    queryKey: ["system", "android-app"],
    queryFn: () => sdk.system.androidApp(),
  });
  return (
    <section
      aria-label="Android app download"
      className="mt-6 space-y-3 border-t border-border pt-6"
    >
      <h3 className="text-sm font-medium">Android App</h3>
      {build.isPending ? (
        <p className="text-sm text-subtle-foreground">
          Checking for a test build…
        </p>
      ) : build.isError ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-subtle-foreground">
            Could not load the Android build.
          </p>
          <Button variant="outline" onClick={() => void build.refetch()}>
            Retry
          </Button>
        </div>
      ) : build.data === null ? (
        <p className="text-sm text-subtle-foreground">
          No Android test build has been published yet.
        </p>
      ) : (
        <>
          <p className="text-sm text-subtle-foreground">
            Version {build.data.version} · Build {build.data.versionCode} ·{" "}
            {Math.ceil(build.data.size / 1024 / 1024)} MB
          </p>
          <Button asChild>
            <a href="/install/bb-android.apk" download="bb-android.apk">
              Download APK
            </a>
          </Button>
          <p className="text-xs text-subtle-foreground">
            Open the download on your Android phone. Allow installation from
            your browser if prompted. Download newer builds here to update.
          </p>
        </>
      )}
    </section>
  );
}
