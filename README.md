This repository is mirrored from our internal GitLab instance.

## Device interview

We offer a script to interview your LAN device. Download the .exe or linux executable from the releases page, and execute it as follows:

```
./interview-shelly-control <your_device_ip>
```

## Development

If you want to develop locally, make sure to remove both the `.nmprc` and `package-lock.json` files first before running `npm install` as otherwise you will not be able to install the dependencies correctly.

When submitting a PR always exclude the `.npmrc` and `package-lock.json` files.
