'use strict';

const moment = require('moment-timezone');

const beans = require('../../testutil/configureForTest').get('beans');
const accessrights = beans.get('accessrights');
const Activity = beans.get('activity');
const Member = beans.get('member');
const Group = beans.get('group');
const expect = require('must-dist');

function guest() {
  const req = {};
  const res = {locals: {}};
  accessrights(req, res, () => undefined);
  return res.locals.accessrights;
}

function standardMember(member) {
  const memberOfUser = member || {};
  const req = {user: {member: new Member(memberOfUser)}};
  const res = {locals: {}};
  accessrights(req, res, () => undefined);
  return res.locals.accessrights;
}

function superuser() {
  // 'superuserID' is set in configureForTest as one valid superuser Id
  return standardMember({id: 'superuserID'});
}

describe('Accessrights for Activities', () => {
  const nextWeek = moment().add(1, 'weeks').unix();
  const lastWeek = moment().subtract(1, 'weeks').unix();
  it('disallows the creation for guests', () => {
    expect(guest().canCreateActivity()).to.be(false);
  });

  it('allows the creation for members', () => {
    expect(standardMember().canCreateActivity()).to.be(true);
  });

  it('disallows editing other member\'s activity for normal user', () => {
    const activity = new Activity({owner: 'somebody'});
    expect(standardMember().canEditActivity(activity)).to.be(false);
  });

  it('allows editing own activity', () => {
    const activity = new Activity({owner: 'id'});
    expect(standardMember({id: 'id'}).canEditActivity(activity)).to.be(true);
  });

  it('allows editing for contactpersons of activity\'s group', () => {
    const group = new Group();
    const activity = new Activity({owner: 'someOtherId'});
    activity.group = group;
    group.organizers = ['id'];

    expect(standardMember({id: 'id'}).canEditActivity(activity)).to.be(true);
  });

  it('disallows editing for contactpersons of other group', () => {
    const group = new Group();
    group.organizers = ['id'];

    const activity = new Activity({owner: 'someOtherId'});
    activity.group = new Group();

    expect(standardMember({id: 'id'}).canEditActivity(activity)).to.be(false);
  });

  it('allows deletion of any activity for superusers', () => {
    const activity = new Activity({owner: 'someOtherId', startUnix: lastWeek});

    expect(superuser().canDeleteActivity(activity)).to.be(true);
  });

  it('allows deletion of future activity for owner', () => {
    const activity = new Activity({owner: 'someOtherId', startUnix: nextWeek});

    expect(standardMember({id: 'someOtherId'}).canDeleteActivity(activity)).to.be(true);
  });

  it('disallows deletion of past activity even for owner', () => {
    const activity = new Activity({owner: 'someOtherId', startUnix: lastWeek});

    expect(standardMember({id: 'someOtherId'}).canDeleteActivity(activity)).to.be(false);
  });

  it('disallows deletion of activity for all others', () => {
    const activity = new Activity({owner: 'someOtherId'});

    expect(standardMember({id: 'id'}).canDeleteActivity(activity)).to.be(false);
    expect(guest().canDeleteActivity(activity)).to.be(false);
  });
});

describe('Accessrights for Groups', () => {
  it('disallows the creation for guests', () => {
    expect(guest().canCreateGroup()).to.be(false);
  });

  it('allows the creation for members', () => {
    expect(standardMember().canCreateGroup()).to.be(true);
  });

  it('allows editing for contact persons', () => {
    const group = new Group();
    group.organizers = ['id'];
    expect(standardMember({id: 'id'}).canEditGroup(group)).to.be(true);
  });

  it('disallows editing for non-contact persons of group', () => {
    const group = new Group();
    group.organizers = ['id'];
    expect(standardMember({id: 'otherId'}).canEditGroup(group)).to.be(false);
  });

  it('disallows editing for contact persons of some other group', () => {
    const group = new Group();
    group.organizers = ['id'];
    expect(standardMember({id: 'id'}).canEditGroup(new Group())).to.be(false);
  });

  it('allows editing for superusers', () => {
    expect(superuser().canEditGroup()).to.be(true);
  });

  it('disallows guest to edit a group', () => {
    expect(guest().canEditGroup(new Group())).to.be(false);
  });

  it('disallows guest to view group details', () => {
    expect(guest().canViewGroupDetails()).to.be(false);
  });

  it('allows every registered member to view group details', () => {
    expect(standardMember().canViewGroupDetails()).to.be(true);
  });

  it('disallows guest to participate in a group', () => {
    expect(guest().canParticipateInGroup()).to.be(false);
  });

  it('allows every registered member to participate in a group', () => {
    expect(standardMember().canParticipateInGroup()).to.be(true);
  });
});

describe('Accessrights for Members', () => {
  it('disallows editing others for members', () => {
    const member = {id: 'id'};
    const otherMember = new Member({id: 'other'});
    expect(standardMember(member).canEditMember(otherMember)).to.be(false);
  });

  it('allows editing herself for members', () => {
    const member = {id: 'id'};
    expect(standardMember(member).canEditMember(new Member(member))).to.be(true);
  });

  it('allows editing others for superusers', () => {
    const otherMember = new Member({id: 'other'});
    expect(superuser().canEditMember(otherMember)).to.be(true);
  });
});

describe('Accessrights for activityresults', () => {
  it('allows creation for superusers', () => {
    expect(superuser().canCreateActivityResult()).to.be(true);
  });

  it('disallows creation for other users', () => {
    const member = {id: 'id'};
    expect(standardMember(member).canCreateActivityResult()).to.be(false);
  });
});
