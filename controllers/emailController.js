const nodemailer = require("nodemailer");
const sendEmail = (req, res) => {
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
	const { studentEmail, studentName, studentMessage, to } = req.body;
	if (!studentEmail || !studentName || !studentMessage || !to) {
		return res.status(400).json({ message: "Please fill all the fields" });
	}
	let mailDetails = {
		from: studentEmail,
		to: to,
		subject: "Complaint from " + studentName + "-" + studentEmail,
		text: studentMessage,
	};
	transporter.sendMail(mailDetails, function (err, data) {
		if (err) {
			console.log(err);
			return res.status(400).json({ err });
		} else {
			console.log("Email sent successfully");
			return res.status(200).json({ data });
		}
	});
};
module.exports = { sendEmail };
