import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { LogUtils } from 'es4x-utils/src/utils/LogUtils';
import { WebClientMgr } from 'es4x-utils/src/network/WebClientMgr';
import { QueryUtils } from 'es4x-utils/src/network/QueryUtils';
import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { UrlUtils } from 'es4x-utils/src/utils/UrlUtils';

class	SendGridAPI
{
	static	get	API_HOST()		{ return "api.sendgrid.com";	}
	static	get	API_VERSION()	{ return "v3";	}

	static	get	URL_BASE_VERIFICATION()	{	return "https://app.sendgrid.com/settings/sender_auth/senders/verify";	}
	static	get	URL_BASE_LOGIN()		{	return "https://app.sendgrid.com/login";	}


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

	async	senderVerification_create(_nickname, _email, _fromName, _addressStreet, _addressState, _addressCity, _addressCountry, _addressZip, _secretKey = "")
	{
		// first we need to make sure it doesn't exist already!
		let	existingSender = await this.senderVerification_get(_email, _secretKey);
		if (existingSender != null)
			return existingSender;

		// build the message body
		let	body = {
			nickname: _nickname,
			from_email: _email,
			reply_to: _email,
			from_name: _fromName,
			reply_to_name: _fromName,
			address: _addressStreet,
			address2: "",
			state: _addressState,
			city: _addressCity,
			country: _addressCountry,
			zip: _addressZip
		};

		// send the query
		let	result = await this.query(QueryUtils.HTTP_METHOD_POST, "/verified_senders", body, _secretKey);

		// do we have it?
		let	newSender = ObjUtils.GetValue(result, "content");
		if (newSender == null)
		{
			LogUtils.LogError("Error creating the sender verification for email: " + _email, body);
			return null;
		}
		else
		{
			return newSender;
		}
	}

	async	senderVerification_get(_email, _secretKey = "")
	{
		// list all of them
		let	allSenders = await this.senderVerification_list(_secretKey);

		// go through all of them
		for(let sender of allSenders)
		{
			// get the email
			let	email = ObjUtils.GetValueToString(sender, "from_email");

			// same one?
			if (email == _email)
				return sender;
		}

		// not found
		return null;
	}

	async	senderVerification_list(_secretKey = "")
	{
		// get the list
		let	result = await this.query(QueryUtils.HTTP_METHOD_GET, "/verified_senders", null, _secretKey);

		// extract it
		return ObjUtils.GetValue(result, "content.results", []);
	}

	async	senderVerification_delete(_email, _secretKey = "")
	{
		// first we need to make sure it doesn't exist already!
		let	existingSender = await this.senderVerification_get(_email, _secretKey);
		if (existingSender == null)
			return true;

		// otherwise we are going to delete it
		let	result = await this.query(QueryUtils.HTTP_METHOD_DEL, "/verified_senders/" + existingSender.id, null, _secretKey);
		return ObjUtils.GetValueToInt(result, "statusCode", 500) == 200;
	}

	async	senderVerification_resend(_email, _secretKey = "")
	{
		// find it
		let	existingSender = await this.senderVerification_get(_email, _secretKey);
		if (existingSender == null)
		{
			LogUtils.LogError("Cannot resend verification because it doesn't exist");
			return false;
		}

		// is it already verified?
		if (existingSender.verified == true)
		{
			LogUtils.LogError("Cannot resend verification because it is already verified");
			return false;
		}

		// send it
		let	result = await this.query(QueryUtils.HTTP_METHOD_POST, "/verified_senders/resend/" + existingSender.id, null, _secretKey);
		let	errorCode = ObjUtils.GetValueToInt(result, "statusCode", 500);
		if (errorCode != 200)
		{
			LogUtils.LogError("Cannot resend verification because of an error: " + errorCode, result);
			return false;
		}
		else
		{
			return true;
		}
	}

	async	senderVerification_verify(_token, _secretKey = "")
	{
		// do it
		let	result = await this.query(QueryUtils.HTTP_METHOD_GET, "/verified_senders/verify/" + _token, null, _secretKey);

		let	errorCode = ObjUtils.GetValueToInt(result, "statusCode", 500);
		if (errorCode != 200)
		{
			LogUtils.LogError("Cannot verify the token with error: " + errorCode, result);
			return false;
		}
		else
		{
			return true;
		}
	}

	async	extractSenderVerificationTokenFromUrl(_url)
	{
		// no url?
		if (StringUtils.IsEmpty(_url) == true)
			return "";

		// is it the verify url? If yes, we can extract the token right away and return it
		if (_url.startsWith(SendGridAPI.URL_BASE_VERIFICATION) == true)
		{
			// extract the parameter "token"
			let	paramsBuf = UrlUtils.ExtractQueryParameters(_url, ["token"]);

			// good?
			if (StringUtils.IsEmpty(paramsBuf["token"]) == false)
				return paramsBuf["token"];
			else
			{
				LogUtils.LogError("Couldnt find the TOKEN from the url: ", {url: _url});
				return "";
			}
		}

		// is it the login url? If yes, we extrac the redirect url and process it
		if (_url.startsWith(SendGridAPI.URL_BASE_LOGIN) == true)
		{
			// extract the parameter "redirect_to"
			let	paramsBuf = UrlUtils.ExtractQueryParameters(_url, ["redirect_to"]);

			// if we have something, we do it
			if (StringUtils.IsEmpty(paramsBuf["redirect_to"]) == false)
			{
				// build the new url
				let	newUrl = "https://app.sendgrid.com" + paramsBuf["redirect_to"];
				return await this.extractSenderVerificationTokenFromUrl(newUrl);
			}
			else
			{
				LogUtils.LogError("Couldnt find the REDIRECT TO from the url: ", {url: _url});
				return "";
			}
		}

		// it must be a redirect url, we are going to get the destination URL
		let	redirectUrl = await this.getWebClient().retrieveRedirectUrl(_url);
		if (StringUtils.IsEmpty(redirectUrl) == true)
		{
			LogUtils.LogError("Couldnt find the redirection URL From the url: ", {url: _url});
			return "";
		}
		else
		{
			return await this.extractSenderVerificationTokenFromUrl(redirectUrl);
		}
	}

}

module.exports = {
	SendGridAPI
};