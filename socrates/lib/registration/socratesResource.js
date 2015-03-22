'use strict';

var _ = require('lodash');
var moment = require('moment-timezone');
var beans = require('simple-configure').get('beans');
var Resource = beans.get('resource');

function addExpirationTimeFor(record) {
  var date = moment();
  date.add(30, 'minutes');
  record.expiresAt = date.toDate();
}

function removeExpiredReservations(registeredMembers) {
  _.remove(registeredMembers, function (record) {
    return record.expiresAt && moment(record.expiresAt).isBefore(moment());
  });
}

function SoCraTesResource(resource) {
  this.state = (resource && resource.state) || {};
  this.resourceName = (resource && resource.resourceName);
  removeExpiredReservations(this.state._registeredMembers);
  return this;
}

// inherit from Resource:
SoCraTesResource.prototype = new Resource();

SoCraTesResource.prototype.recordFor = function (memberId) {
  return _.find(this.state._registeredMembers, {memberId: memberId});
};

SoCraTesResource.prototype.reserve = function (registrationTuple) {
  var sessionID = 'SessionID:' + registrationTuple.sessionID;
  if (!this.addMemberId(sessionID)) { return false; }
  var record = this.recordFor(sessionID);
  addExpirationTimeFor(record);
  record.duration = registrationTuple.duration;
  return true;
};

SoCraTesResource.prototype.register = function (memberID, registrationTuple) {
  var sessionID = 'SessionID:' + registrationTuple.sessionID;
  var index = this.registeredMembers().indexOf(sessionID);
  if (index > -1) {
    this.state._registeredMembers.splice(index, 1);
  }

  if (!this.addMemberId(memberID)) { return false; }
  var record = this.recordFor(memberID);
  record.duration = registrationTuple.duration;
  return true;
};

SoCraTesResource.prototype.hasValidReservationFor = function (registrationTuple) {
  var self = this;
  var sessionID = 'SessionID:' + registrationTuple.sessionID;
  if (!self.state._registeredMembers) {
    self.state._registeredMembers = [];
  }
  var record = self.recordFor(sessionID);
  return !!(record && record.expiresAt && moment(record.expiresAt).isAfter(moment()));
};

module.exports = SoCraTesResource;
