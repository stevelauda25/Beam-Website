# Hero workspace demo provenance

This website-only demo reproduces the Beam desktop application's file workspace behavior for the marketing Hero.

- Product behavior reference: the Beam desktop application's workspace and local-storage flows
- Website implementation: this directory only
- Storage namespace: `beam-website-hero-demo-storage`

The website does not import, link, iframe, or read code or assets from the desktop application at runtime. Uploaded files remain in the visitor's browser through IndexedDB and are not sent to a server.
