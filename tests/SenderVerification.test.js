/// <reference types="@vertx/core" />
// @ts-check
import { TestSuite } from '@vertx/unit';
import { StringUtils } from 'es4x-utils/src/utils/StringUtils';

import { SendGridAPI } from '../src/SendGridAPI';
const	config = require('./test_config.json');

const suite = TestSuite.create("ES4X Test: Sender Verification");


suite.test("SendGridAPI.extractSenderVerificationTokenFromUrl", async function (context) {

	let async = context.async();

	try
	{
		// create the new SendGridAPI Api object
		let	sendGridApi = new SendGridAPI(vertx, config.secret_key);

		// retrieve the token
		let	url = "https://u298828.ct.sendgrid.net/ss/c/KeecV0-eUYdPWIcLaNcQIk8KHRb5oSkirDE8JL2zHb43giRdffV4A9P-M2zuA5z8yn9k718SwxXLtsouqB_R0O55ERXeLn0ds7a6ThnkVIhw5R4CdUnuKmbjjJGs4N_u-Y_q1d42X8m2X86YFqjRx5OTiDvKvQFMwBiX2vZIv0vodDWwABQNlR7PzrSPvCCJqaktzqnlDnHhf59UfQNuK_WaL01ZMf89XB2iwTaWR3BkE7woUoziOFEBj0aYCl26exhGJFOZin2kuMhZYc65ADFJ-P75naB2YmlYgXaHgOCcA2L3ltvTkO5zAq8PhmsbMTMFERxOLj3WxGzfYauEppx7d8k0jks6F36ZFh3gu3iIryPtv4_EfZkA7ZjFuQ41-Vqv5coiHiR0fCpUjr37Orf2VuR5A0Z5Q5CB3Oa5KWVsxnnw9JO8oTyXPth1bFMJHLzuCdQD0cpXgK3JkJkqghLxNtxfvxzYXF7BvONdAyA/3yr/frE8C7bnSuyOSAnAAe6zbw/h9/Qpyi0iqDavEM-hB3eGSUwNrqKhphMEO6wjabxSvxAGw";
		let	token = await sendGridApi.extractSenderVerificationTokenFromUrl(url);
		console.log("We found token:");
		console.log(token);
		context.assertFalse(StringUtils.IsEmpty(token));

		// now we are going to verify it
		let	verifyOk = await sendGridApi.senderVerification_verify(token);
		context.assertTrue(verifyOk);

		async.complete();
	}
	catch(e)
	{
		console.trace(e);
		async.complete();
	}
});

suite.test("SendGridAPI.senderVerification_create", async function (context) {

	let async = context.async();

	try
	{
		// create the new SendGridAPI Api object
		let	sendGridApi = new SendGridAPI(vertx, config.secret_key);

		// send the verification
		let	nickname = "test stactapp";
		let	email = "mike@stactapp.com";
		let	fromName = "Mike";
		let	doDelete = false;

		// first we delete it
		if (doDelete)
		{
			console.log("1. DELETE EXISTING IF ANY");
			let	isDeleted = await sendGridApi.senderVerification_delete(email);
			context.assertTrue(isDeleted);

			// now we find it
			console.log("2. MAKE SURE IT DOESN'T EXIST");
			let	existing = await sendGridApi.senderVerification_get(email);
			context.assertNull(existing);
		}

		// create it
		console.log("3. CREATE IT");
		let	newSender = await sendGridApi.senderVerification_create(nickname, email, fromName);
		context.assertNotNull(newSender);

		// now we find it again
		console.log("4. READ IT AGAIN");
		let	existing = await sendGridApi.senderVerification_get(email);
		context.assertNotNull(existing);
		context.assertEquals(newSender.id, existing.id);

		// resend it
		console.log("5. RESEND THE VERIFICATION");
		let	resendOk = await sendGridApi.senderVerification_resend(email);
		if (newSender.verified == false)
			context.assertTrue(resendOk);
		else
			context.assertFalse(resendOk);

		console.log(newSender);

		async.complete();
	}
	catch(e)
	{
		console.trace(e);
		async.complete();
	}
});

suite.run();
