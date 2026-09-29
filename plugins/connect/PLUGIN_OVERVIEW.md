Open cc from another device through a connect service that you operate.

Hosted access is disabled until configured. Set `CC_CONNECT_BASE_URL` to your
service origin and restart cc, then enter a pairing code in Remote access.
Alternatively run `cc connect --code <code> --server <server-url>` with the full
server URL supplied by your service's dashboard.

The plugin holds the tunnel in the background and reconnects after a drop.
Disable it to disconnect remote access. Your source and server data remain on
the machine running cc. Local access and tailnet URLs work without this plugin.

Use `cc connect expose <port>` to share an HTTP port with authenticated users of
your own service. Mobile pairing requires an explicit service/server URL; cc
does not enroll devices with any upstream hosted service by default.
