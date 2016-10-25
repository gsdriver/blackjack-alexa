/*
 * MIT License

 * Copyright (c) 2016 Garrett Vargas

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

var http = require('http');

    // Basic Strategy Intent
    "PlayGameIntent": function (intent, session, response) {
        var actionSlot = intent.slots.Action;
        var speechError;
        var cardTitle;
        var speechOutput;
        var repromptOutput;
        var speech = "Sorry, internal error. What else can I help with?";

        // Do we have session attributes - at minimum a userID?  If not, get a new one
        if (!session.attributes || !session.attributes.userID)
        {
            speech = "Is this an async issue";
            GetGameState(session.user.userId, function(error, gameState) {
                if (error)
                {
                    speechError = error;
                    speech = "There was an error: " + error;
                }    
                else
                {
                    session.attributes = gameState;
                    speech = "I'm sorry, I had to reinitialize the game. What else can I help with?";
                }
            });
        }
        // Do we have an action
        else if (!actionSlot) {
            speechError = "I'm sorry, I didn't catch that action. Please say what you want to do on this hand like hit or stand. What else can I help with?";
        }
        else if (!actionSlot.value) {
            speechError = "I'm sorry, I don't understand how to " + actionSlot.value + ". Please provide an action like hit or stand. What else can I help with?";
        }
        else if (!session.attributes.possibleActions || (session.attributes.possibleActions.indexOf(actionSlot.value) < 0)) {
            // Probably need a way to read out the game state
            speechError = "I'm sorry, " + actionSlot.value + " is not a valid action at this time. What else can I help with?";
        }
        else {
            // OK, let's post this action and get a new game state
            PostUserAction(session.attributes, actionSlot.value, function(error, gameState) {
                if (error)
                {
                    speechError = error;
                }    
                else
                {
                    session.attributes = gameState;
                    speech = "New actions are " + gameState.possibleAction.length;
                }
            });
        }

        cardTitle = "Blackjack Game";

        if (speechError)
        {
            speechOutput = {
                speech: speechError,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            repromptOutput = {
                speech: "What else can I help with?",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            response.ask(speechOutput, repromptOutput);
        }
        else {
            speechOutput = {
                speech: speech,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            response.tellWithCard(speechOutput, cardTitle, "Hit or stand");
        }
    },


function GetGameState(userID, callback) 
{
    var endpoint = "http://blackjacktutor-env.us-west-2.elasticbeanstalk.com";
    var queryString = '?userID=' + userID;

    http.get(endpoint + queryString, function (res) {
        if (res.statusCode == 200)
        {
            // Great, we should have a game!
            var fulltext = '';

            res.on('data', function(data) {
                fulltext += data;    
            });

            res.on('end', function() {
                callback(null, JSON.parse(fulltext));    
            });
        }
        else
        {
            // Sorry, there was an error calling the HTTP endpoint
            callback("Unable to call endpoint", null);
        }
    }).on('error', function (e) {
        callback("Communications error: " + e.message, null);
    });
}

function PostUserAction(gameState, action, callback)
{
    var endpoint = "http://blackjacktutor-env.us-west-2.elasticbeanstalk.com";
    var payload = "userID=" + gameState.userID;
    
    payload += "&action=" + action;
    if (action == "bet")
    {
        payload += "&value=" + 100;
    }
    http.post(endpoint, payload, function (res) {
        if (res.statusCode == 200)
        {
            // Great, we should have a game!
            var fulltext = '';

            res.on('data', function(data) {
                fulltext += data;    
            });

            res.on('end', function() {
                callback(null, JSON.parse(fulltext));    
            });
        }
        else
        {
            // Sorry, there was an error calling the HTTP endpoint
            callback("Unable to call endpoint", null);
        }
    }).on('error', function (e) {
        callback("Communications error: " + e.message, null);    
    });
}

