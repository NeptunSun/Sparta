describe('policies.wizard.service.policy-trigger-service', function () {
  beforeEach(module('webApp'));
  beforeEach(module('served/trigger.json'));
  beforeEach(module('served/policy.json'));

  var service, q, rootScope, httpBackend, translate, ModalServiceMock, PolicyModelFactoryMock, TriggerModelFactoryMock,
    fakeTrigger2, fakeTrigger3, resolvedPromiseFunction, rejectedPromiseFunction,
    fakeTrigger = null;
  var fakePolicy = {};

  beforeEach(module(function ($provide) {
    ModalServiceMock = jasmine.createSpyObj('ModalService', ['openModal']);
    PolicyModelFactoryMock = jasmine.createSpyObj('PolicyModelFactory', ['getCurrentPolicy', 'enableNextStep', 'disableNextStep']);
    TriggerModelFactoryMock = jasmine.createSpyObj('TriggerFactory', ['getTrigger', 'isValidTrigger', 'resetTrigger', 'getContext', 'setError']);
    PolicyModelFactoryMock.getCurrentPolicy.and.returnValue(fakePolicy);

    // inject mocks
    $provide.value('ModalService', ModalServiceMock);
    $provide.value('PolicyModelFactory', PolicyModelFactoryMock);
    $provide.value('TriggerModelFactory', TriggerModelFactoryMock);
  }));

  beforeEach(inject(function (_servedTrigger_, _servedPolicy_, $q, $rootScope, $httpBackend, $translate) {
    fakeTrigger = _servedTrigger_;
    angular.extend(fakePolicy, _servedPolicy_);

    translate = $translate;
    q = $q;
    httpBackend = $httpBackend;
    rootScope = $rootScope;

    // mocked responses
    ModalServiceMock.openModal.and.callFake(function () {
      var defer = $q.defer();
      defer.resolve();
      return {"result": defer.promise};
    });

    $httpBackend.when('GET', 'languages/en-US.json')
      .respond({});

    TriggerModelFactoryMock.getTrigger.and.returnValue(fakeTrigger);
    TriggerModelFactoryMock.getContext.and.returnValue({"position": 0});

    spyOn(translate, "instant").and.callThrough();

    fakeTrigger2 = angular.copy(fakeTrigger);
    fakeTrigger3 = angular.copy(fakeTrigger);
    fakeTrigger2.name = "fakeTrigger2";
    fakeTrigger3.name = "fakeTrigger3";
    fakeTrigger2.outputs.push("fakeTrigger2 output");
    fakeTrigger3.outputs.push("fakeTrigger3 output");

    resolvedPromiseFunction = function () {
      var defer = q.defer();
      defer.resolve();
      return defer.promise;
    };

    rejectedPromiseFunction = function () {
      var defer = q.defer();
      defer.reject();
      return defer.promise;
    };

  }));

  beforeEach(inject(function (_TriggerService_) {
    service = _TriggerService_;
  }));


  describe("should be able to show a confirmation modal when trigger is going to be removed", function () {
    beforeEach(function () {
      translate.instant.calls.reset();
    });

    afterEach(function () {
      rootScope.$digest();
    });

    it("modal should render the confirm modal template", function () {
      service.showConfirmRemoveTrigger().then(function () {
        expect(ModalServiceMock.openModal.calls.mostRecent().args[1]).toBe('templates/modal/confirm-modal.tpl.html');
      });
    });

    it("modal should be called to be opened with the correct params", function () {
      var expectedModalResolve = {
        title: function () {
          return "_REMOVE_TRIGGER_CONFIRM_TITLE_"
        },
        message: ""
      };
      service.showConfirmRemoveTrigger().then(function () {
        expect(ModalServiceMock.openModal.calls.mostRecent().args[2].title()).toEqual(expectedModalResolve.title());
        expect(ModalServiceMock.openModal.calls.mostRecent().args[2].message()).toEqual(expectedModalResolve.message);
      });
    });
  });

  describe("should be able to add a trigger to the trigger container", function () {
    var triggerContainer = [];
    beforeEach(function () {
      service.setTriggerContainer(triggerContainer);
    });

    it("trigger is not added if it is not valid", function () {
      TriggerModelFactoryMock.isValidTrigger.and.returnValue(false);
      service.addTrigger();
      expect(triggerContainer.length).toBe(0);
    });

    describe("if trigger is valid", function () {
      beforeEach(function () {
        TriggerModelFactoryMock.isValidTrigger.and.returnValue(true);
        service.addTrigger();
      });

      it("it is added to policy with its position", function () {
        expect(triggerContainer.length).toBe(1);
        expect(triggerContainer[0].name).toEqual(fakeTrigger.name);
      });
    });
  });

  describe("should be able to remove the trigger of the factory by its id", function () {
    var triggerContainer = [];
    beforeEach(inject(function ($rootScope) {
      triggerContainer = [fakeTrigger, fakeTrigger2, fakeTrigger3];
      service.setTriggerContainer(triggerContainer);
      rootScope = $rootScope;
    }));

    afterEach(function () {
      rootScope.$apply();
    });

    it("trigger is removed if confirmation modal is confirmed", function () {
      service.removeTrigger(0).then(function () { // remove the first trigger
        expect(triggerContainer.length).toBe(2);
        expect(triggerContainer[0]).toBe(fakeTrigger2);
        expect(triggerContainer[1]).toBe(fakeTrigger3);
      })
    });

    it("trigger is not removed if confirmation modal is cancelled", function () {
      ModalServiceMock.openModal.and.callFake(function () {
        var defer = q.defer();
        defer.reject();
        return {"result": defer.promise};
      });
      service.removeTrigger(0).then(function () { // remove the first trigger
      }, function () {
        expect(triggerContainer.length).toBe(3);
        expect(triggerContainer[0]).toBe(fakeTrigger);
        expect(triggerContainer[1]).toBe(fakeTrigger2);
        expect(triggerContainer[2]).toBe(fakeTrigger3);
      })
    });
  });

  it("should be able to return if a trigger is a new trigger by its position", function () {
    var triggerContainer = [];
    triggerContainer.push(fakeTrigger);
    triggerContainer.push(fakeTrigger);
    triggerContainer.push(fakeTrigger);

    service.setTriggerContainer(triggerContainer);

    expect(service.isNewTrigger(0)).toBeFalsy();
    expect(service.isNewTrigger(2)).toBeFalsy();
    expect(service.isNewTrigger(3)).toBeTruthy();
  });

  describe("should be able to save a modified trigger", function () {
    var triggerContainer = null;
    beforeEach(function () {
      triggerContainer = [];
      service.setTriggerContainer(triggerContainer);
    });
    it("is saved if it is valid and error is hidden", function () {
      var form = {};
      TriggerModelFactoryMock.isValidTrigger.and.returnValue(true);
      service.saveTrigger(form);

      expect(triggerContainer.length).toBe(1);
      expect(TriggerModelFactoryMock.setError).not.toHaveBeenCalled();
    });

    it("is not saved if it is invalid and error is updated to a generic form error", function () {
      var form = {};
      TriggerModelFactoryMock.isValidTrigger.and.returnValue(false);
      service.saveTrigger(form);

      expect(triggerContainer.length).toBe(0);
      expect(TriggerModelFactoryMock.setError).toHaveBeenCalled();
    });
  });

  it("should be able to activate and disable the panel to create a new trigger", function () {
    service.activateTriggerCreationPanel();

    expect(service.isActiveTriggerCreationPanel()).toBe(true);

    service.disableTriggerCreationPanel();

    expect(service.isActiveTriggerCreationPanel()).toBe(false);
  });

  describe("should be able to generate a help for sql queries", function () {
    it("if trigger is for transformations, help is created with an only item with 'stream' as name and all output fields of transformations as fields", function () {
      service.setTriggerContainer(fakePolicy.streamTriggers, "transformation");

      var fakeTransformation1 = {
        outputFields: [{name: "outputField1.1", type: "string"}, {
          name: "outputField1.2",
          type: "string"
        }]
      };
      var fakeTransformation2 = {
        outputFields: [{name: "outputField2.1", type: "string"}, {
          name: "outputField2.2",
          type: "string"
        }]
      };
      fakePolicy.transformations = [fakeTransformation1, fakeTransformation2];

      var sqlHelpItems = service.getSqlHelpSourceItems();

      expect(sqlHelpItems.length).toBe(1);
      expect(sqlHelpItems[0].name).toBe("stream");
      expect(sqlHelpItems[0].fields).toEqual(fakeTransformation1.outputFields.concat(fakeTransformation2.outputFields));
    })
  })
});
