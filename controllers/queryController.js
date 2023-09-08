const dialogflow = require("@google-cloud/dialogflow");
const nodemailer = require("nodemailer");
const hostelDetails = require("../hostelDetails.json");
const sessionClient = new dialogflow.SessionsClient();
const projectId = "hello-byvu";
const sessionId = "123456";
const queries = ["hi"];
const languageCode = "en";

async function detectIntent(
	projectId,
	sessionId,
	query,
	contexts,
	languageCode
) {
	// The path to identify the agent that owns the created intent.
	const sessionPath = sessionClient.projectAgentSessionPath(
		projectId,
		sessionId
	);

	// The text query request.
	const request = {
		session: sessionPath,
		queryInput: {
			text: {
				text: query,
				languageCode: languageCode,
			},
		},
	};

	if (contexts && contexts.length > 0) {
		request.queryParams = {
			contexts: contexts,
		};
	}

	const responses = await sessionClient.detectIntent(request);
	return responses[0];
}

async function executeQueries(projectId, sessionId, queries, languageCode) {
	// Keeping the context across queries let's us simulate an ongoing conversation with the bot
	let context;
	let intentResponse;
	for (const query of queries) {
		try {
			intentResponse = await detectIntent(
				projectId,
				sessionId,
				query,
				context,
				languageCode
			);
			context = intentResponse.queryResult.outputContexts;
		} catch (error) {
			console.log(error);
			reject(error);
		}
	}
	console.log(intentResponse?.queryResult?.intent?.displayName);
	if (
		intentResponse?.queryResult?.intent?.displayName ==
		"specific_hostel_details"
	) {
		const hostelName =
			intentResponse?.queryResult?.parameters?.fields?.hostel_name?.stringValue;
		const specificity =
			intentResponse?.queryResult?.parameters?.fields?.specificity?.stringValue;
		const hostel = hostelDetails.filter((hostel) => hostel.id == hostelName)[0];
		if (specificity == "capacity") {
			return {
				message: `The capacity of ${hostel?.name} is ${hostel?.capacity}.`,
				res: intentResponse,
			};
		}
		if (specificity == "warden") {
			return {
				message: `Here are the warden details of ${hostel?.name}, \n ${hostel?.wardenDetails?.name}, \n ${hostel?.wardenDetails?.mobile}, \n ${hostel?.wardenDetails?.email}.`,
				res: intentResponse,
			};
		}
		if (specificity == "caretaker") {
			return {
				message: `Here are the care-taker details of ${hostel?.name}, \n ${hostel?.caretakerDetails?.name}, \n ${hostel?.caretakerDetails?.mobile}.`,
				res: intentResponse,
			};
		}
		if (specificity == "canteen") {
			return {
				message: hostel?.canteen
					? `Yes, ${hostel?.name} has a canteen.`
					: `No, ${hostel?.name} does not have a canteen.`,
				res: intentResponse,
			};
		}
		if (specificity == "nonVeg") {
			return {
				message: hostel?.nonVeg
					? `The hostel serves only eggs as a non-vegetarian option, it means that their non-vegetarian offerings are limited to eggs, and they do not provide dishes with other types of meat such as chicken, fish, or beef`
					: `No, ${hostel?.name} does not serve Non-veg food.`,
				res: intentResponse,
			};
		}
		if (specificity == "room") {
			return {
				message: hostel?.tripleOccupancy
					? `${hostel?.name} provides triple occupancy rooms to 1st year studentsn \n and single occupancy rooms to all the other students.`
					: `${hostel?.name} provides single occupancy rooms to all the students.`,

				res: intentResponse,
			};
		}
		if (specificity == "ethernet") {
			return {
				message: hostel?.ethernet
					? `Yes, ${hostel?.name} has ethernet.`
					: `No, ${hostel?.name} does not have ethernet.`,
				res: intentResponse,
			};
		}
		if (specificity == "services") {
			return {
				message: `${hostel?.name} provides many services - \n${
					hostel?.laundry && "Laundry services"
				}, \n ${
					!!hostel?.sports.length &&
					"Sports facilities like " + hostel?.sports.join(", ")
				} \n ${
					hostel?.commonRoom && "and common room for various activities."
				}`,
				res: intentResponse,
			};
		}
		return intentResponse;
	}
	if (intentResponse?.queryResult?.intent?.displayName == "how_many") {
		const year = Number(
			intentResponse?.queryResult?.parameters?.fields?.year?.stringValue
		);
		const gender =
			intentResponse?.queryResult?.parameters?.fields?.gender?.stringValue;
		let hostels = [];
		if (year && gender) {
			hostels = hostelDetails?.filter((hostel) => {
				return hostel?.year.includes(year) && hostel?.gender == gender;
			});
		} else if (year) {
			hostels = hostelDetails?.filter((hostel) => {
				return hostel?.year.includes(year);
			});
		} else if (gender) {
			hostels = hostelDetails?.filter((hostel) => {
				return hostel?.gender == gender;
			});
		}
		return {
			message: hostels.map((hostel) => hostel?.name).join(", "),
			res: intentResponse,
		};
	}
	if (
		intentResponse?.queryResult?.intent?.displayName ==
		"complain_3"
	) {
		const hostelName =
			intentResponse?.queryResult?.outputContexts[0]?.parameters?.fields
				?.hostel_name?.stringValue;
		const studentEmail =
			intentResponse?.queryResult?.outputContexts[0]?.parameters?.fields?.email
				?.listValue?.values[0]?.stringValue;
		const studentName =
			intentResponse?.queryResult?.outputContexts[0]?.parameters?.fields?.any
				?.stringValue;
		const room =
			intentResponse?.queryResult?.outputContexts[0]?.parameters?.fields
				?.room_no?.stringValue;
		const studentMessage = intentResponse?.queryResult?.queryText;
		const wardenEmail = hostelDetails.filter(
			(hostel) => hostel.id == hostelName
		)[0]?.wardenDetails?.email;
		const transporter = nodemailer.createTransport({
			service: "gmail",
			host: "smtp.gmail.com",
			port: 587,
			secure: false,
			auth: {
				user: "ssaryans597@gmail.com",
				pass: process.env.GMAIL_PASS,
			},
		});
		let mailDetails = {
			from: studentEmail,
			to: wardenEmail,
			subject: "Complaint from " + studentName + "-" + studentEmail,
			text: studentMessage,
		};
		const response = await new Promise((resolve, reject) => {
			transporter.sendMail(mailDetails, function (err, data) {
				if (err) {
					console.log(err);
					reject({
						message: "There was an error sending the email",
						res: intentResponse,
					});
				} else {
					console.log("Email sent successfully");
					resolve({
						message: "Complaint sent successfully",
						res: intentResponse,
					});
				}
			});
		});
		return response;
	}
	return {
		message: intentResponse?.queryResult?.fulfillmentMessages[0].text.text[0],
		res: intentResponse,
	};
}
const handleQuery = async (req, res) => {
	const { queries } = req.body;
	if (!queries) return res.json({ message: "No query sent" }).status(404);
	console.log(queries);
	try {
		const response = await executeQueries(
			projectId,
			sessionId,
			queries,
			languageCode
		);
		return res.json(response).status(200);
	} catch (error) {
		console.log(error);
		return res.json(error);
	}
};

module.exports = { handleQuery };
