/**
 * Lambda function for handling Alexa Skill requests that uses Urbandictionary.com REST api to define a term.
 * Examples:
 * One-shot model:
 *  User: "Alexa, ask Urban Dictionary what is the meaning of Boston Pancake?"
 *  Alexa: "(queries Urbandictionary.com REST api and finds the term)"
 */

'use strict';

var AlexaSkill = require('./AlexaSkill');

var config = require('./config');

var _ = require('lodash');

var request = require('request');
var console = require('tracer').colorConsole();

var appId = config.appId;

var UrbanAlexa = function () {
    AlexaSkill.call(this, appId);
};

var goodbyes = ["bye", "later", "peace", "farewell", "see ya", "cya", "adios", "peace out"];

UrbanAlexa.prototype = Object.create(AlexaSkill.prototype);
UrbanAlexa.prototype.constructor = UrbanAlexa;

UrbanAlexa.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    var repromptOutput, speechOutput;

    speechOutput = {
        speech: "Welcome to the Urban. You can ask a question like, what's the meaning of cleveland steamer? ... Now, what can I help you with.",
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    repromptOutput = {
        speech: "For instructions on what you can say, please say help me.",
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.ask(speechOutput, repromptOutput);
};

UrbanAlexa.prototype.intentHandlers = {
    "RandomWord": function (intent, session, alexaResponse) {
        var speech, speechOutput, repromptOutput;
        request({
            url: config.random,
            method: "GET",
            json: true,
            headers: {
                "Accept": "application/json"
            }
        }, function (error, response, body) {
            if (error) {
                console.log(error);
                speechOutput = {
                    speech: "<speak>" + "I'm sorry, I couldn't get the random word</speak>",
                    type: AlexaSkill.speechOutputType.SSML
                };
                alexaResponse.tellWithCard(speechOutput, "Urban Dictionary", speechOutput);
            } else {
                // console.log(response.statusCode, body);
                if (body.result_type === 'no_results') {
                    speechOutput = {
                        speech: "<speak>" + "I'm sorry, I couldn't get the random word</speak>",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    alexaResponse.tellWithCard(speechOutput, "Urban Dictionary", speechOutput);
                } else {
                    var cleanDefinition = body.list[0].definition.replace(/\n/g, '').replace(/\r/g, '');
                    var cleanExample = body.list[0].example.replace(/\n/g, '').replace(/\r/g, '');
                    speech = "" +
                        "<speak>" +
                        "<p>" + body.list[0].word + ":" + "<break time='0.5s'/>" + cleanDefinition + "</p>" +
                        "<p>" + "Here is an example:" + "<break time='0.5s'/>" + cleanExample + "</p>" +
                        "<p>" + "Would you like to hear another definition?" + "</p>" +
                        "</speak>";

                    session.attributes.definitions = body.list;
                    session.attributes.similarTerms = _.uniq(body.tags);
                    session.attributes.definitionPointer = 0;
                    session.attributes.random = true;
                }
                speechOutput = {
                    speech: speech,
                    type: AlexaSkill.speechOutputType.SSML
                };
                repromptOutput = {
                    speech: "<speak>" + "Would you like to hear another definition?" + "</speak>",
                    type: AlexaSkill.speechOutputType.SSML
                };
                alexaResponse.ask(speechOutput, repromptOutput);
            }
        });
    },
    "WordOfTheDay": function (intent, session, alexaResponse) {
        var speechOutput = {
            speech: "<speak>" + "Word of the day is coming soon" + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        };
        alexaResponse.tell(speechOutput);
    },
    "DefineTerm": function (intent, session, alexaResponse) {
        var termSlot = intent.slots.Term;
        var speech, speechOutput, repromptOutput;
        var definitionPointer = 0;

        var hasTerm = termSlot && termSlot.value;

        if (!hasTerm) {
            speechOutput = {
                speech: "<speak>" + "I'm sorry, I couldn't find the term you were looking for." + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            alexaResponse.tell(speechOutput);
        }

        console.log(termSlot.value);

        request({
            url: config.endpoint,
            method: "GET",
            json: true,
            qs: {
                term: termSlot.value
            },
            headers: {
                "Accept": "application/json"
            }
        }, function (error, response, body) {
            if (error) {
                console.log(error);
                speechOutput = {
                    speech: "<speak>" + "I'm sorry, I couldn't find the term: " + termSlot.value + "</speak>",
                    type: AlexaSkill.speechOutputType.SSML
                };
                alexaResponse.tellWithCard(speechOutput, "Urban Dictionary", speechOutput);
            } else {
                console.log(response.statusCode, body);
                if (body.result_type === 'no_results') {
                    speechOutput = {
                        speech: "<speak>" + "I'm sorry, I couldn't find the term: " + termSlot.value + "</speak>",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    alexaResponse.tellWithCard(speechOutput, "Urban Dictionary", speechOutput);
                } else {
                    var cleanDefinition = body.list[definitionPointer].definition.replace(/\n/g, '').replace(/\r/g, '');
                    var cleanExample = body.list[definitionPointer].example.replace(/\n/g, '').replace(/\r/g, '');
                    speech = "" +
                        "<speak>" +
                        "<p>" + termSlot.value + ":" + "<break time='0.5s'/>" + cleanDefinition + "</p>" +
                        "<p>" + "Here is an example:" + "<break time='0.5s'/>" + cleanExample + "</p>" +
                        "<p>" + "Would you like to hear another definition?" + "</p>" +
                        "</speak>";

                    session.attributes.definitions = body.list;
                    session.attributes.similarTerms = _.uniq(body.tags);
                    session.attributes.definitionPointer = definitionPointer;
                    session.attributes.random = false;
                }
                speechOutput = {
                    speech: speech,
                    type: AlexaSkill.speechOutputType.SSML
                };
                repromptOutput = {
                    speech: "<speak>" + "Would you like to hear another definition?" + "</speak>",
                    type: AlexaSkill.speechOutputType.SSML
                };
                alexaResponse.ask(speechOutput, repromptOutput);
            }
        });
    },
    "AMAZON.StopIntent": function (intent, session, response) {
        response.tell(getGoodbye());
    },
    "AMAZON.CancelIntent": function (intent, session, response) {
        response.tell(getGoodbye());
    },
    "AMAZON.NoIntent": function (intent, session, response) {
        var similarTerms = session.attributes.similarTerms;
        if (Array.isArray(similarTerms) && similarTerms.length > 0) {
            var speechOutput = {
                speech: "<speak>Before you go, here is a list of terms that you might be interested in: " + similarTerms.join(',') + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            response.tell(speechOutput);
        } else {
            response.tell(getGoodbye());
        }
    },
    "AMAZON.YesIntent": function (intent, session, response) {
        var speechOutput, repromptOutput;

        if (session.attributes.random) {
            var speech;
            request({
                url: config.random,
                method: "GET",
                json: true,
                headers: {
                    "Accept": "application/json"
                }
            }, function (error, res, body) {
                if (error) {
                    console.log(error);
                    speechOutput = {
                        speech: "<speak>" + "I'm sorry, I couldn't get the random word</speak>",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    response.tellWithCard(speechOutput, "Urban Dictionary", speechOutput);
                } else {
                    // console.log(res.statusCode, body);
                    if (body.result_type === 'no_results') {
                        speechOutput = {
                            speech: "<speak>" + "I'm sorry, I couldn't get the random word</speak>",
                            type: AlexaSkill.speechOutputType.SSML
                        };
                        response.tellWithCard(speechOutput, "Urban Dictionary", speechOutput);
                    } else {
                        var cleanDefinition = body.list[0].definition.replace(/\n/g, '').replace(/\r/g, '');
                        var cleanExample = body.list[0].example.replace(/\n/g, '').replace(/\r/g, '');
                        speech = "" +
                            "<speak>" +
                            "<p>" + body.list[0].word + ":" + "<break time='0.5s'/>" + cleanDefinition + "</p>" +
                            "<p>" + "Here is an example:" + "<break time='0.5s'/>" + cleanExample + "</p>" +
                            "<p>" + "Would you like to hear another definition?" + "</p>" +
                            "</speak>";

                        session.attributes.definitions = body.list;
                        session.attributes.similarTerms = _.uniq(body.tags);
                        session.attributes.definitionPointer = 0;
                        session.attributes.random = true;
                    }
                    speechOutput = {
                        speech: speech,
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    repromptOutput = {
                        speech: "<speak>" + "Would you like to hear another definition?" + "</speak>",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    response.ask(speechOutput, repromptOutput);
                }
            });
        } else {

            var sessionDefinitions = session.attributes.definitions;
            var sessionPointer = session.attributes.definitionPointer + 1;

            // console.log(sessionDefinitions, sessionDefinitions.length);

            if (Array.isArray(sessionDefinitions) && sessionDefinitions.length > 1) {
                var cleanResponse = sessionDefinitions[sessionPointer].definition.replace(/\n/g, '').replace(/\r/g, '');
                var cleanExample = sessionDefinitions[sessionPointer].example.replace(/\n/g, '').replace(/\r/g, '');

                speechOutput = {
                    speech: "<speak>" +
                        "<p>" + cleanResponse + "</p>" +
                        "<p>" + "Here is an example:" + "<break time='0.5s'/>" + cleanExample + "</p>" +
                        "<p>" + "Would you like to hear another definition?" + "</p>" +
                        "</speak>",
                    type: AlexaSkill.speechOutputType.SSML
                };
                repromptOutput = {
                    speech: "<speak>" + "Would you like to hear another definition?" + "</speak>",
                    type: AlexaSkill.speechOutputType.SSML
                };
                session.attributes.definitionPointer = sessionPointer;
                response.ask(speechOutput, repromptOutput);
            } else {
                speechOutput = {
                    speech: "<speak>I gave you all the definitions that I have. I can't believe the term is still not clear for you!</speak>",
                    type: AlexaSkill.speechOutputType.SSML
                };
                response.tell(speechOutput);
            }
        }
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        var speechText = "Using urbandictionary.com, you can ask for popular terms  such as, what's the meaning of cleveland steamer, or, you can say exit... Now, what can I help you with?";
        var repromptText = "You can say things like, what's the meaning of cleveland steamer, or you can say exit... Now, what can I help you with?";
        var speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask(speechOutput, repromptOutput);
    }
};

exports.handler = function (event, context) {
    var urbanAlexa = new UrbanAlexa();
    urbanAlexa.execute(event, context);
};

function getGoodbye() {
    return goodbyes[randomInt(0, goodbyes.length)];
}

function randomInt(low, high) {
    return Math.floor(Math.random() * high);
}
