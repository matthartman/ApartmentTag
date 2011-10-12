/* The Mail controller
*/
/*
exports.sendMail = function(req, res){

	var email = require("mailer");
	var sgusername = 'aptag';
	var sgpassword = 'mfhmfh';
	email.send({
	    host : "smtp.sendgrid.net",
	    port : "587",
	    domain : "apt.ag",
	    to : "matthartman@bandwagon.fm",
	    from : "matt@apt.ag",
	    subject : "This is a subject",
	    body: "Hello, this is a test body",
	    authentication : "login",
	    username : sgusername,
	    password : sgpassword
	  },
	  function(err, result){
	    if(err){
	      console.log(err);
	    }
	});

	res.render('testmail');
}

exports.sendMail2 = function(req, res){
	var mailer = require('mailer');

	mailer.send({
	    // node_mailer supports authentication,
	    // docs at: https://github.com/marak/node_mailer
	    host:    'localhost',
	    port:    '25',
	    to:      'alex@example.com',
	    from:    'nodepad@example.com',
	    subject: 'Welcome to Nodepad',
	    body:    'All work and no play makes DailyJS pretty dull'
	  },

	  // Your response callback
	  function(err, result) {
	    if (err) {
	      console.log(err);
	    }
	  }
	);
}
*/

exports.sendMail = function(req, res){
	
	var nodemailer = require('nodemailer');

	// one time action to set up SMTP information
	nodemailer.SMTP = {
	    host: 'smtp.sendgrid.net'
	}
	
	// send an e-mail
	nodemailer.send_mail(
	    // e-mail options
	    {
	        sender: 'matt@apt.ag',
	        to:'matt@bandwagon.fm',
	        subject:'Hello!',
	        html: '<p><b>Hi,</b> how are you doing?</p>',
	        body:'Hi, how are you doing?'
	    },
	    // callback function
	    function(error, success){
	        console.log('Message ' + success ? 'sent' : 'failed');
	    }
	);
	res.render('testmail');
}

exports.sendQuestion = function(questionText){
	var nodemailer = require('nodemailer');

	// one time action to set up SMTP information
	nodemailer.SMTP = {
	    host: 'smtp.sendgrid.net'
	}
	
	// send an e-mail
	nodemailer.send_mail(
	    // e-mail options
	    {
	        sender: 'matt@apt.ag',
	        to:'matt@bandwagon.fm',
	        subject:'Question about your apt listing',
	        html: '<p><b>Hi,</b> You have a message about your Craigslist Listing.</p><p>The question is: <BR>' + questionText + '</p>',
	        body:'Hi, here is some body text?'
	    },
	    // callback function
	    function(error, success){
	        console.log('Question Sent (' + questionText + ') ' + success ? 'sent' : 'failed');
	    }
	);
	
}
// PRIVATE