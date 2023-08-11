# Introduction
This library offers a SDK to access Sendgrid services for the [ES4X Runtime](https://github.com/reactiverse/es4x).

Right now only a few methods have been created:
- **Send email**

# Usage
## Add dependency
For now just add the Github url to your dependencies in the **package.json** file:
```
"dependencies": {
	"@vertx/core": "4.1.0",
	"@vertx/web": "4.2.5",
	"@vertx/web-client": "4.2.5",
	"es4x-sdk-sendgrid": "git+https://github.com/omnislash-com/es4x-sdk-sendgrid.git#main"
}
```

# Maintenance
Update ES4X Utils:
```bash
npm run update:helpers
```
