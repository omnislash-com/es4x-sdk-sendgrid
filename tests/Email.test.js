/// <reference types="@vertx/core" />
// @ts-check
import { TestSuite } from '@vertx/unit';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';
import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';

import { SendGridAPI } from '../src/SendGridAPI';
const	config = require('./test_config.json');

const suite = TestSuite.create("ES4X Test: Email");


suite.test("SendGridAPI.sendEmail", async function (context) {

	let async = context.async();

	try
	{
		// create the new SendGridAPI Api object
		let	sendGridApi = new SendGridAPI(vertx, config.secret_key);

		// send each email
		for(let toSend of config.email)
		{
			// send the email
			let	response = await sendGridApi.sendEmail(toSend.to, toSend.from.email, toSend.from.name, toSend.subject, toSend.content.html, toSend.content.text, "", toSend.bcc);

			// get the error code
			let	errorCode = ObjUtils.GetValueToInt(response, "statusCode", 500);

			let	isGood = errorCode == 200 || errorCode == 202;
			context.assertTrue(isGood);
		}

		async.complete();
	}
	catch(e)
	{
		console.trace(e);
		async.complete();
	}
});

suite.run();
