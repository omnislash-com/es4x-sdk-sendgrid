import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { LogUtils } from 'es4x-utils/src/utils/LogUtils';
import { WebClientMgr } from 'es4x-utils/src/network/WebClientMgr';
import { QueryUtils } from 'es4x-utils/src/network/QueryUtils';
import { StringUtils } from 'es4x-utils/src/utils/StringUtils';

class	SendGridAPI
{
	static	get	API_HOST()		{ return "api.sendgrid.com";	}
	static	get	API_VERSION()	{ return "v3";	}


	constructor(_vertx, _secretKey)
	{
		this.__vertx = _vertx;
		this.__webClient = null;

		this.__secretKey = _secretKey;
	}

	getWebClient()
	{
		// lazy load the web client only when we need it
		if (this.__webClient == null)
		{
			this.__webClient = new WebClientMgr(this.__vertx);
		}

		// return it
		return this.__webClient;		
	}

	async	query(_method, _path, _data = null, _secretKey = "")
	{
		// prepare the header
		let	secretKey = StringUtils.IsEmpty(_secretKey) ? this.__secretKey : _secretKey;
		let	headers = {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + secretKey
		};

		// add the version to the path
		let	fullPath = "/" + SendGridAPI.API_VERSION + _path;

		// run the query
		let	response = await this.getWebClient().query(_method, SendGridAPI.API_HOST, fullPath, _data, headers, true);

		return response;
	}


	async	sendEmail(_toEmail, _fromEmail, _fromName, _subject, _contentHTML, _contentText = "", _secretKey = "")
	{
		// build the message body
		let	body = {
			"personalizations": [
				{
					"to": [
						{
							"email": _toEmail
						}
					]
				}
			],
			"from": {
				"email": _fromEmail,
				"name": _fromName
			},
			"reply_to": {
				"email": _fromEmail,
				"name": _fromName
			},
			"subject": _subject,
			"content": []
		};

		// text content? Must be first!
		if (StringUtils.IsEmpty(_contentText) == false)
		{
			body.content.push({
				"type": "text/plain",
				"value": _contentText
			});
		}

		// html content?
		if (StringUtils.IsEmpty(_contentHTML) == false)
		{
			body.content.push({
				"type": "text/html",
				"value": _contentHTML
			});
		}

		// send the query
		let	result = await this.query(QueryUtils.HTTP_METHOD_POST, "/mail/send", body, _secretKey);
		console.log(result);
		return result;
	}
}

module.exports = {
	SendGridAPI
};