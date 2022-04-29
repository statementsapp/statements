(function () {
  'use strict';

  /** @ngInject */
  function EditorController(
    $log,
    $state,
    $location,
    $interval,
    $rootScope,
    $scope,
    $sce,
    $stateParams,
    chatSocket,
    apiService,
    profileService,
    libraryService,
    profile,
    library,
    $uibModal,
    $uibModalStack,
    messageFormatter,
    BookFactory,
    focusFactory,
    Notification,
    $document,
    $timeout,
    IdFactory,
    ColorFactory,
    toastr) {




    // variable declarations
    $scope.currentLocation = $location.absUrl();
    $scope.roomUsersHtml = '<span>Nothing here yet</span>';
    $scope.roomUsers = [];
    $scope.menuExpanded = false;
    $scope.propToAddAnimate = {};
    $scope.propToDeleteAnimate = {};
    $scope.propToRejoinAnimate = {};
    $scope.isFresh = true;
    $scope.isAlmostFresh = true;
    $scope.isMessageFresh = true;
    $scope.enter = '< enter >';
    $scope.colon = '< : >';
    $scope.aRemarkIsMousedOver = false;
    $scope.containerMouseover;
    $scope.paragraphMouseIsOver = {};
    $scope.statementHighlightIs = '';
    $scope.mouseIsOver = '';


    // copies to clipboard
    $scope.copyLink = function() {
      var copyElement = document.getElementById('directLinkInput');
      copyElement.select();
      document.execCommand('copy');
      toastr.info('Link copied to clipboard');
    }

    // assigns room users
    $scope.$on('socket:roomUsers', function (event, args) {
      $scope.roomUsers = Object.assign([], args);

    });

    // sends out a payload on user leave
    $scope.$on('socket:leave', function (event, args) {
      socket.emit('getUsers', $scope.bookId);

    });


    $scope.$on('socket:room', function (event, args) {
      socket.emit('getUsers', $scope.bookId);

    });

    /**
     * Changes the menu button color
     * @param i the menu button index.
     * @param hover true, if hovering; false, otherwise.
     */
    $scope.changeMenuButtonColor = function (i, hover) {
      if (!hover) {
        $scope.menuButtons[i].bgColor = '#ffffff';
      } else {
        $scope.menuButtons[i].bgColor = $scope.menuButtons[i].hoverColor;
      }
    };

    // For the toolbar button hover colors.
    $scope.hoverColors = [];
    for (var i = 0; i < 6; ++i) {
      $scope.hoverColors.push(ColorFactory.random());
    }

    // Check to load profile if we're logged in and profile isn't loaded for some reason
    $interval(function () {
        if ($rootScope.uid && $rootScope.token && $scope.profile === undefined) {
          apiService.readProfile().then(function (res) {
            if (res.status === 200) {
              if (res.data) {
                profileService.setProfile(res.data);
              } else {
                profileService.setProfile({
                    books: [],
                    emailAddress: '',
                    firstName: 'Guest',
                    lastName: 'User',
                    displayName: 'Guest User',
                    lastModified: new Date()
                });
              }
              $scope.profile = profileService.getProfile();
              $scope.userId = $rootScope.uid;
              chatSocket.emit('userUpdated', {
                userId: $rootScope.uid,
                displayName: $scope.profile.displayName,
                bookId: $scope.bookId
              });
            }
          });
          apiService.readLibrary().then(function (res) {
            if (res.status === 200) {
              libraryService.setLibrary(res.data);
              $scope.library = libraryService.getLibrary();
            }
          });
        } else if ($scope.bookId && $scope.profile && !$scope.roomUsers.includes($scope.profile.displayName)) {
          chatSocket.emit('userUpdated', {
            userId: $rootScope.uid,
            displayName: $scope.profile.displayName,
            bookId: $scope.bookId
          });
        }
    }, 250);

    // Function that clears vestigial stuff saved into the model
    function isArray(o) {
      return Object.prototype.toString.call(o) === '[object Array]';
    }

    $scope.goFullScreenText = function (){
      $scope.fullScreenText = true;
      $scope.fullScreenMessages = false;
    }

    $scope.goFullScreenMessages = function (){
      $scope.fullScreenText = false;
      $scope.fullScreenMessages = true;
    }

    $scope.goSplitScreen = function (){
      $scope.fullScreenText = false;
      $scope.fullScreenMessages = false;
    }

    $scope.assignFirstsToNodes = function(){
      console.log("assigning firsts to nodes")

      var apply = {};

      traverse($scope.data[0]);

      function traverseArray(arr) {
        arr.forEach(function (x) {
          traverse(x);
        });
      }

      function traverseObject(obj) {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            traverse(obj[key], key, obj);
          }
        }
      }

      function traverse(x, key, obj) {
        if (isArray(x)) {
          traverseArray(x);
        } else if ((typeof x === 'object') && (x !== null)) {
          traverseObject(x);
        } else {
          if (key === 'nodeId' && obj.minimized !== undefined) {

            for (var i = 0; i < obj.paragraphs.length; i++){
              if (obj.paragraphs[i][$scope.userId] !== 'hidden' &&
                !obj.paragraphs[i].hiddenForAll){
                // console.log(i, " will be skipped")
                // console.log("Object: ", obj)
                obj.paragraphs[i].first = true;
                apply.paragraphSkip = i;
                break;
              }
            }
            // console.log("Past that for")
            for (var i = 0; i < obj.paragraphs.length; i++){
              if (i !== apply.paragraphSkip){
                // console.log(i, " will not get a first")
                obj.paragraphs[i].first = false;
              }
            }

            // apply.nodeSkip = null;
            apply.paragraphSkip = null;

            // console.log("Else if paragraphid")
            for (var h = 0; h < obj.paragraphs.length; h++){
              for (var i = 0; i < obj.paragraphs[h].propositions.length; i++){
                if (obj.paragraphs[h].propositions[i][$scope.userId] !== 'hidden' &&
                  !obj.paragraphs[h].propositions[i].hiddenForAll &&
                  !apply.skip){
                  // console.log(i, " will get a first on paragraph")

                  obj.paragraphs[h].propositions[i].first = true;
                  apply.skip = true;


                } else if (apply.skip){
                  obj.paragraphs[h].propositions[i].first = false;
                }
              }
              apply.skip = false;
            }



          }
        }
      }
    }



    // Signs out
    $scope.logout = function () {
      apiService.signOut().then(function () {
        profileService.clear();
        libraryService.clear();
        $rootScope.guest = false;
        $state.go('login');
      });
    };

    $scope.hideAwayNegations = function () {

    }

    function setCursor(pos, id) {
        console.log("goes into setcursor function")
        var tag = document.getElementById(id);

        // Creates range object
        var setpos = document.createRange();

        // Creates object for selection
        var set = window.getSelection();
        console.log("Pos: ", pos)
        // Set start position of range
        setpos.setStart(tag.childNodes[0], pos);

        // Collapse range within its boundary points
        // Returns boolean
        setpos.collapse(true);

        // Remove all ranges set
        set.removeAllRanges();

        // Add range with respect to range object.
        set.addRange(setpos);

        // Set cursor on focus
        tag.focus();
    }

    $scope.makePristine = function () {
      console.log("making pristine")

      function traverse(x, key, obj) {
        if (isArray(x)) {
          traverseArray(x);
        } else if ((typeof x === 'object') && (x !== null)) {
          traverseObject(x);
        } else {
          //
        }
      }

      function traverseArray(arr) {
        arr.forEach(function (x) {
          traverse(x);
        });
      }

      function traverseObject(obj) {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            traverse(obj[key], key, obj);
          }
        }
      }

      if (!$scope.once) {
        $scope.once = true;
        traverse($scope.data[0]);
      }

      if ($('span').hasClass('visible-cursor')) {
        $('span').removeClass('visible-cursor');
        $('span').addClass('invisible-cursor');
      }
      if ($("div").hasClass('blackline')) {
        $("div").removeClass('blackline');
      }
    };

    $scope.inverted = false;
    // Inverts page colors
    $scope.invert = function () {

      // Silly function
      // Update menu button icon
      var css = 'html {-webkit-filter: invert(100%);' +
        '-moz-filter: invert(100%);' +
        '-o-filter: invert(100%);' +
        '-ms-filter: invert(100%); }',
        head = document.getElementsByTagName('head')[0],
        style = document.createElement('style');
      if (!window.counter) {
        window.counter = 1;
      } else {
        window.counter++;
      }
      if (window.counter % 2 === 0) {
        var css =
          'html {-webkit-filter: invert(0%); -moz-filter: invert(0%); -o-filter: invert(0%); -ms-filter: invert(0%); }';
      }
      style.type = 'text/css';
      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
      head.appendChild(style);
      $scope.inverted = !$scope.inverted;
      var icon = $scope.inverted ? 'fas fa-sun' : 'fas fa-moon';
      for (var i = 0; i < $scope.menuButtons.length; i++) {
        if ($scope.menuButtons[i].key === 'invert') {
          $scope.menuButtons[i].icon = icon;
        }
      }
    };


    $scope.copyBookIdToClipboard = function () {
      var ghost = document.createElement('textarea');
      document.body.appendChild(ghost);
      ghost.value = $scope.bookId;
      ghost.select();
      document.execCommand('copy');
      document.body.removeChild(ghost);
    };


    // Modal button function for new books
    $scope.openNewBookModal = function () {
      $scope.addBookModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-new-book',
        ariaDescribedBy: 'modal-body-new-book',
        templateUrl: 'app/editor/new-book-modal/new-book-modal.html',
        size: 'lg',
        controller: 'NewBookModalController',
        controllerAs: 'vm',
        keyboard: false,
        backdrop: 'static',
        // windowTemplateUrl: 'app/editor/new-book-modal/choice-window.html',
        resolve: {
          profileService: profileService,
          libraryService: libraryService,
          apiService: apiService
        }
      }).result.then(function (bookId) {
        if (bookId) {
          chatSocket.emit('leave', bookId);
          $state.go('main.editor', {bookId: bookId});
        }
      });
    };

    $scope.openLibraryModal = function () {
      $scope.addBookModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-library',
        ariaDescribedBy: 'modal-body-library',
        templateUrl: 'app/editor/library-modal/library-modal.html',
        size: 'lg',
        controller: 'LibraryModalController',
        controllerAs: 'vm',
        keyboard: false,
        backdrop: 'static',
        resolve: {
          profileService: profileService,
          libraryService: libraryService,
          apiService: apiService
        }
      }).result.then(function (bookId) {
        if (bookId) {
          chatSocket.emit('leave', $scope.bookId);
          $state.go('main.editor', {bookId: bookId});
        }
      });
    };

    $scope.openLoginModal = function () {
      $scope.loginModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-login',
        ariaDescribedBy: 'modal-body-login',
        templateUrl: 'app/landing/login-modal/login-modal.html',
        size: 'lg',
        controller: 'LoginModalController',
        controllerAs: 'vm',
        backdrop: 'static',
        keyboard: false,
      }).result.then(function (success) {
        if (success) {
          $location.reload();
        }
      });
    };

    $scope.openRegisterModal = function () {
      $scope.loginModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-register',
        ariaDescribedBy: 'modal-body-register',
        templateUrl: 'app/landing/register-modal/register-modal.html',
        size: 'lg',
        controller: 'RegisterModalController',
        controllerAs: 'vm',
        backdrop: 'static',
      }).result.then(function (success) {
        if (success) {
          $location.reload();
        }
      });
    };

    $scope.openProfileModal = function () {
      $scope.addBookModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-profile',
        ariaDescribedBy: 'modal-body-profile',
        templateUrl: 'app/editor/profile-modal/profile-modal.html',
        size: 'lg',
        controller: 'ProfileModalController',
        controllerAs: 'vm',
        backdrop: 'static',
        keyboard: false,
        resolve: {
          profileService: profileService,
          libraryService: libraryService,
          apiService: apiService
        }
      }).result.then(function () {
        $scope.profile = profileService.getProfile();

        chatSocket.emit('userUpdated', {
          userId: $scope.uid,
          displayName: $scope.profile.displayName,
          bookId: $scope.bookId
        });
      });
    };

    $scope.openAddExistingBookModal = function () {
      $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-add-existing-book',
        ariaDescribedBy: 'modal-body-add-existing-book',
        templateUrl: 'app/editor/add-existing-book-modal/add-existing-book-modal.html',
        size: 'lg',
        controller: 'AddExistingBookModalController',
        controllerAs: 'vm',
        backdrop: 'static',
        keyboard: false,
        resolve: {
          apiService: apiService,
          profileService: profileService
        }
      }).result.then(function (bookId) {
        if (bookId) {
          $state.go('main.editor', {bookId: bookId});
        }
      });
    };

    $scope.openOptionsModal = function () {
      $uibModal.open({
        ariaLabelledBy: 'modal-title-editor-options',
        ariaDescribedBy: 'modal-body-editor-options',
        templateUrl: 'app/editor/editor-options-modal/editor-options-modal.html',
        controller: 'EditorOptionsModalController',
        controllerAs: 'vm',
        size: 'md',
        backdrop: 'static',
        keyboard: false,
        resolve: {
          options: function () {
            return $scope.options;
          }
        }
      }).result.then(function (res) {
        $scope.options = res;
      });

    };

    // Loading data
    $scope.loadData = function (bookId) {
      $timeout(function() {
        apiService.readBook(bookId).then(function (result) {
          $scope.data = [ result.data ];
          $scope.title = $scope.data[0].nodes[0].topic;
          apiService.readPropositions(bookId).then(function (result) {
            if (result) {
              $scope.propositions = result.data;
              $scope.bookId = bookId;
              $scope.mainLoop();
            }
          }).catch(function (error) {
            // console.error(1Gerror);
          });
        }).catch(function (error) {
          // console.error(error);
        });
      }, 10);
    };

    $uibModalStack.dismissAll();

    // If a book id is present, load it
    if ($stateParams.bookId) {
      $scope.bookId = $stateParams.bookId;
      $scope.loadData($scope.bookId);
    }

    // Frontend option variables
    $scope.options = {
      highlightOwned: false,
      dimNotOwned: false
    };

    // $scope.title = '';
    $scope.profile = profileService.getProfile();
    $scope.userId = $rootScope.uid;

    $scope.loggedIn = function () {
      return $rootScope.uid !== undefined;
    };

    $scope.isGuest = function() {
      return $rootScope.guest;
    };

    $scope.canSeeTitle = function() {
      return $scope.isGuest() || $scope.loggedIn();
    };

    // Main function
    $scope.mainLoop = function () {

      $scope.treeOptions = {};
      $scope.mousedOverProposition = {};
      $scope.topics = [{}];
      $scope.scroll = {};
      $scope.keyword = {};
      $scope.messageLog = '';
      $scope.inputs = {};
      $scope.selectedThread = {};
      $scope.preselectedProposition = {};
      $scope.selectedRemark = {};
      $scope.of = {};
      $scope.highlight = {};
      $scope.mark = {};
      $scope.doubleClick = 0;
      $scope.whatHasBeenClicked = '';
      $scope.dontrunfocusout = false;
      $scope.fullScreenText = true;
      $scope.fullScreenMessages = false;
      $scope.hasTopFocus = '';
      $scope.hasBottomFocus = {};
      $scope.hasLeftFocus = {};
      $scope.hasRightFocus = {};
      $scope.hasChatFocusThreadId = '';
      $scope.hasChatFocusId = '';
      $scope.toBeClearedLater = {};
      $scope.toSetLater = {};
      $scope.threadAddMouseover = '';
      $scope.threadAdding = '';
      $scope.newProp;
      $scope.stopToggle = false;
      $scope.once = false;
      $scope.lastItemCursorLayer = 0;
      $scope.demoCounter = 0;
      $scope.cancelListenForDoubleClick;
      $scope.draggedNode = {};
      $scope.draggedParagraph= {};
      $scope.draggedProposition = {};
      $scope.propositionToSetLater = {};
      $scope.paragraphToSetLater = {};
      $scope.testCounter = 0;
      $scope.dialogueMouseOver;
      $scope.recycleRemarks = false;
      $scope.xMouseOver;
      $scope.upperDragScrollerMouseOver = false;
      $scope.lowerDragScroller = false;
      $scope.tempStopEditable = false;
      $scope.minimalStyle = false;
      $scope.diagnostics = false;
      var hidden = '';
      var visibilityChange = '';
      $scope.theseInputs = [];
      $scope.data[0].isFresh = true;
      if (!$scope.data[0].documentClaimedBy){
        $scope.data[0].authorTable = [];
      }


      var theDragElement = document.getElementById('dragelement')
      // console.log("The drag element: ", theDragElement)
      var onMouseMove = function(e){
        // console.log("E:", e)
        // console.log("The drag element:", theDragElement)

        setTimeout(function () {
          $scope.$apply(function () {

              if ($scope.draggingProposition || $scope.draggingParagraph || $scope.draggingNode){
                document.getElementById('dragelement').style.left = ((parseInt(e.pageX) * 1.33) + 10).toString() + 'px';
                document.getElementById('dragelement').style.top = (parseInt(e.pageY) * 1.33).toString() + 'px';
              }

          });
        }, 5);

      };
      document.addEventListener('mousemove', onMouseMove);

      var prep = {};
      var apply = {};
      var temp = {};

      // Deals with empty remarks values

      for (var i = 0; i < $scope.data[0].nodes.length; i++){
        for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
          for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
            // console.log("Working with: ", $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks)
            if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks === undefined){
              // console.log(angular.copy(i), ", ", angular.copy(j), ", ", angular.copy(k), ": ", angular.copy($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks))
              $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks = [];
              // console.log("Now: ", angular.copy(i), ", ", angular.copy(j), ", ", angular.copy(k), ": ", angular.copy($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks))
            }
          }
        }
      }

      //   Pastel colors for paragraphs
      $scope.pastels = ['#f9ceee', '#e0cdff', '#c1f0fb', '#dcf9a8', '#ffebaf'];
      $scope.lighterOtherPastels = ['#ffbec4', '#edf5dd', '#d0f1e5', '#dbe0f1'];

      // these are the current pastels
      $scope.otherPastels = ['#e7f8f2'];
      // Other suitable pastels below
      // ,'#c7ceea','#ffb7b2'


      // used to have #edeff8 #DDE1D6 #a7e99c
      if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support
        hidden = 'hidden';
        visibilityChange = 'visibilitychange';
      } else if (typeof document.msHidden !== 'undefined') {
        hidden = 'msHidden';
        visibilityChange = 'msvisibilitychange';
      } else if (typeof document.webkitHidden !== 'undefined') {
        hidden = 'webkitHidden';
        visibilityChange = 'webkitvisibilitychange';
      }

      var dialogueList = document.getElementById('dialoguelist');

      function handleVisibilityChange() {
        if (document[hidden]) {
          $scope.hasRightFocus = {};
          // $scope.clearBlankOnBlur(null, true);
        } else {
          return;
        }
      }

      // Warn if the browser doesn't support addEventListener or the Page Visibility API
      if (typeof document.addEventListener === 'undefined' || hidden === undefined) {
        $scope.inputs.nothing;
      } else {
        // Handle page visibility change
        document.addEventListener(visibilityChange, handleVisibilityChange, false);
      }


      // full screen text if no messages
      if ($scope.data[0].dialogue){

        $scope.fullScreenMessages = false;
        $scope.fullScreenText = false;
      }


      $scope.assignFirstsToNodes();


      // Shuffles paragraph color order
      function shuffle(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;
        while (0 !== currentIndex) {
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;
          temporaryValue = array[currentIndex];
          array[currentIndex] = array[randomIndex];
          array[randomIndex] = temporaryValue;
        }
        return array;
      }

      shuffle($scope.otherPastels);
      $scope.userColorTable = [];
      //initializes as number of colors in the palette
      $scope.userColorCount = $scope.otherPastels.length;

      if (!$scope.userColor){
        $scope.userColor = $scope.otherPastels[$scope.data[0].authorTable.length-1];
      }
      // For picking a color from the palette
      $scope.generateNewColor = function () {
        var index = $scope.userColorCount % $scope.otherPastels.length;
        $scope.userColorCount++;
        return $scope.otherPastels[index];
      };

      $scope.toggleNode = function (node) {
        node.minimized = !node.minimized;
      };

      $scope.goRecycleRemarks = function () {
        $scope.recycleRemarks = true;
      }

      $scope.dontRecycleRemarks = function () {
        $scope.recycleRemarks = false;
      }

      // $scope.goRecycleRemarks();
      // $scope.hideOthersParagraphs();


      $scope.makeTextFile = function() {

        // Build the book into a text string

        $scope.bookBeingCompiled = '';

        console.log('Making the text file');

        var levelZero = '';
        var levelOne = '';
        var levelTwo = '';
        var levelThree = '';

        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          console.log("Node being evaluated: ", $scope.data[0].nodes[i])

          if ($scope.data[0].nodes[i].sectionLevel == 0){
            console.log("If. Adding: ", $scope.data[0].nodes[i].topic)
            $scope.bookBeingCompiled = $scope.bookBeingCompiled + levelZero + $scope.data[0].nodes[i].topic + '\r\n\r\n';
          } else if ($scope.data[0].nodes[i].sectionLevel == 1){
            console.log("If. Adding: ", $scope.data[0].nodes[i].topic)
            $scope.bookBeingCompiled = $scope.bookBeingCompiled + levelOne + $scope.data[0].nodes[i].topic + '\r\n\r\n';
          } else if ($scope.data[0].nodes[i].sectionLevel == 2){
            console.log("First else. Adding: ", $scope.data[0].nodes[i].topic)

            $scope.bookBeingCompiled = $scope.bookBeingCompiled + levelTwo + $scope.data[0].nodes[i].topic + '\r\n\r\n';
          } else if ($scope.data[0].nodes[i].sectionLevel == 3){
            console.log("Second else. Adding: ", $scope.data[0].nodes[i].topic)
            $scope.bookBeingCompiled = $scope.bookBeingCompiled + levelThree + $scope.data[0].nodes[i].topic + '\r\n\r\n';
          }

          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
            if (!$scope.data[0].nodes[i].paragraphs[j].hiddenForAll &&
                $scope.data[0].nodes[i].paragraphs[j][$scope.userId] !== 'hidden'){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                if (!$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden'){
                  console.log("Text if. Adding: ", $scope.data[0].nodes[i].paragraphs[j].text)
                  $scope.bookBeingCompiled = $scope.bookBeingCompiled + $scope.data[0].nodes[i].paragraphs[j].propositions[k].text + ' ';
                }
              }
            }
            $scope.bookBeingCompiled = $scope.bookBeingCompiled + '\r\n\r\n';
          }
        }



        // Make a blob of teh book being compiled
        var data = new Blob([$scope.bookBeingCompiled], { type: 'text/plain' });

        // If there's already a text file variable assigned, revoke its url
        if ($scope.textFile !== null) {
          window.URL.revokeObjectURL($scope.textFile);
        }

        // Make a URL of the data and save it as textFile
        $scope.textFile = window.URL.createObjectURL(data);


        // Return textFile
        return $scope.textFile;
      };


      var create = document.getElementById('downloadlink');
      $scope.textFile = $scope.data[0];
      //works

      if (create) {
        create.addEventListener('click', function() {
          var link = document.getElementById('downloadlink');
          link.href = $scope.makeTextFile();
          console.log('Link HREF: ', link.href);
        }, false);
      }

      $scope.clickDownloadLink = function () {
        console.log("Clicking the download link")
        document.getElementById('downloadlink').click();
      }

      $scope.assignColorsToExistingRemarks = function () {

        // needed but needs to be rewritten
        console.log("assigning colors to existing remarks")

        function traverse(x, key, obj) {
          if (isArray(x)) {
            traverseArray(x);
          } else if ((typeof x === 'object') && (x !== null)) {
            traverseObject(x);
          } else {
            if (key === 'isMessage') {
              for (var i = 0; i < $scope.userColorTable.length; i++) {
                if (x === $scope.userColorTable[i].author && x !== $scope.userId) {
                  var alreadyThere = true;
                  var index = i;
                  break;
                }
              }

              if (x !== $scope.userId && x !== '' && obj.type !== 'topic' && alreadyThere) {
                console.log("Already there for object: ", obj, " and x of ", x)
                if (obj.author == $scope.userId){
                  obj.color = $scope.userColorTable[index].color;
                } else {
                  obj.color = 'lightgray';
                }

              }

              if (!alreadyThere && obj.type !== 'topic' && x !== '' && x !== $scope.userId){
                console.log("NOT already there for object: ", obj, " and x of ", x)
                $scope.userColorTable.push(
                  {
                    author: x,
                    color: $scope.generateNewColor()
                  }
                )
                if (obj.author == $scope.userId){
                  obj.color = $scope.userColorTable[$scope.userColorTable.length-1].color;
                } else {
                  obj.color = 'lightgray';
                }

              }
            }
          }
        }

        function traverseArray(arr) {
          arr.forEach(function (x) {
            traverse(x);
          });
        }

        function traverseObject(obj) {
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              traverse(obj[key], key, obj);
            }
          }
        }

        // Executes
        traverse($scope.data[0].dialogue);
      };

      // Runs functions that clean up vestigial stuff saved into the data
      $scope.makePristine();
      //
      //



      // Scrolls to the bottom of messages
      $timeout(function () {
        var pane = document.getElementById('dialoguelist');
        pane.scrollTop = pane.scrollHeight;
      }, 30);

      $scope.getSectionByNodeId = function(id){

      }

      $scope.getParagraphByParagraphId = function(id){

      }

      $scope.getPropositionById = function(id){

      }

      // If an empty book, focus on the blank proposition
      var blankClickAssigned = {};
      // console.log("blank clicking complex")
      for (var i = $scope.data[0].nodes[0].paragraphs.length-1; i > -1; i--) {
        // console.log("Into the outer, i of ", i)
        for (var j = $scope.data[0].nodes[0].paragraphs[i].propositions.length-1; j > -1; j--) {
          // console.log("Into the inner, j of ", j)
          if ($scope.data[0].nodes[0].paragraphs[i][$scope.userId] !== 'hidden' &&
            !$scope.data[0].nodes[0].paragraphs[i].hiddenForAll &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j][$scope.userId] !== 'hidden' &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j].hiddenForAll !== true &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j].type !== 'blank') {
            // console.log('if')
            blankClickAssigned.assigned = true;
            break;
          } else if ($scope.data[0].nodes[0].paragraphs[i][$scope.userId] !== 'hidden' &&
            !$scope.data[0].nodes[0].paragraphs[i].hiddenForAll &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j].type === 'blank' &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j].hiddenForAll !== true &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j][$scope.userId] !== 'hidden') {
            // console.log('else')
            blankClickAssigned.id = $scope.data[0].nodes[0].paragraphs[i].propositions[j].id;
            blankClickAssigned.paragraphPosition = i;
            blankClickAssigned.position = j;
          }
        }
      }
      if (!blankClickAssigned.assigned) {
        // console.log("not blank click assigned")
        // console.log("blank click assigned object: ", blankClickAssigned)
        // console.log("id object: ", $scope.data[0].nodes[0].paragraphs[blankClickAssigned.paragraphPosition])
        // console.log("paragraph id: ", document.getElementById('paragraph' + $scope.data[0].nodes[0].paragraphs[blankClickAssigned.paragraphPosition].paragraphId))
        $scope.selectedNode = $scope.data[0].nodes[0];
        $scope.selectedParagraph = $scope.data[0].nodes[0].paragraphs[blankClickAssigned.paragraphPosition];
        $scope.selectedProposition =
        $scope.data[0].nodes[0].paragraphs[blankClickAssigned.paragraphPosition].propositions[blankClickAssigned.position];
        $timeout(function () {
          // console.log("PROCEEDING WITH BLANK CLICK")
          document.getElementById('proposition' + blankClickAssigned.id).click();
          blankClickAssigned = {};
        }, 10);
      }



      // If the data doesn't have a dialogue, make the dialogue empty
      if (!$scope.data[0].hasOwnProperty('dialogue')) {
        $scope.data[0].dialogue = [];
      }

      // When propositions are being typed as new messages directly on a topic
      $scope.showThreadAdd = function (thread) {

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.hasChatFocusId = '';
            $scope.hasChatFocusThreadId = '';
            $scope.threadAdding = thread.threadId;
            $('#addto' + thread.threadId).expanding();
            focusFactory('addto' + thread.threadId);
          });
        }, 20);

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.hasChatFocusId = '';
            $scope.hasChatFocusThreadId = '';
            $scope.threadAdding = thread.threadId;
            $('#addto' + thread.threadId).expanding();
            $('#addto' + thread.threadId).expanding(); //duplicate
            focusFactory('addto' + thread.threadId);
          });
        }, 20);
        $scope.stopToggle = true;
      };

      // Hides
      $scope.hideThreadAdd = function () {
        $scope.threadAdding = '';
        $scope.stopToggle = true;
      };

      // For when clicks do multiple things
      $scope.exitNgClick = function () {
        $scope.stopToggle = false;
      };

      // Fires sometimes
      $scope.selectBlank = function (node) {
        // console.log("Selecting a blank")
        var id = $scope.data[0].nodes[0].paragraphs[0].propositions[0].id;
        $scope.selectedNode = node;
        $scope.selectedParagraph = $scope.data[0].nodes[0].paragraphs[0];
        $scope.selectedProposition = $scope.data[0].nodes[0].paragraphs[0].propositions[0];
        $timeout(function () {
          document.getElementById('proposition' + id).click();
        }, 0);
      };

      $scope.openNav = function () {
        document.getElementById('myNav').style.height = '100%';
      };

      $scope.closeNav = function () {
        document.getElementById('myNav').style.height = '0%';
      };

      // For blurring the text
      $scope.blurText = function () {
        console.log("Blurring text")
        if (document.getElementById('thetext').classList
          .contains('textblurrer')) {
          document.getElementById('thetext').classList
            .remove('textblurrer');
        } else {
          document.getElementById('thetext').classList
            .add('textblurrer');
        }
      };

      $scope.queryBlur = function () {

        if (document.getElementById('dialoguepane').classList.contains('dialogueblurrer')){
          return true;
        } else {
          return false;
        }
      }

      $scope.statementHighlight = function(id){

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.statementHighlightIs = id;
          });
        }, 0);
      }

      $scope.statementUnHighlight = function(id){

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.statementHighlightIs = '';
          });
        }, 5);
      }

      $scope.assessDragScrollUpper = function () {
        // if ($scope.draggedProposition.id && $scope.upperDragScrollerMouseOver){

          document.getElementById('tree-root').scrollTop--;
          // console.log("triggers scroll upper")
        // }
      }

      $scope.assessDragScrollLower = function () {
        // if ($scope.draggedProposition.id && $scope.upperDragScrollerMouseOver){
          // console.log("lower ding");
          // console.log('Element: ', document.getElementById(''));
          document.getElementById('tree-root').scrollTop += 1;
          console.log("triggers scroll lower")

        // }
      }

      $scope.toggleMinimalStyling = function () {
        $scope.minimalStyle = !$scope.minimalStyle;
      }

      // For text blurrer
      $scope.mouseOverTextBlurrer = function () {
        document.getElementById('textblurrer').classList
          .add('dialogueblurrermouseover');
          $scope.lowerDragScroller = !$scope.lowerDragScroller;

      };

      // Leave text blurrer
      $scope.mouseLeaveTextBlurrer = function () {
        document.getElementById('textblurrer').classList
          .remove('dialogueblurrermouseover');
      };

      // Blurs dialogue
      $scope.blurDialogue = function () {
        if (document.getElementById('dialoguepane').classList
          .contains('dialogueblurrer')) {
          document.getElementById('dialoguepane').classList
            .remove('dialogueblurrer');
        } else {
          document.getElementById('dialoguepane').classList
            .add('dialogueblurrer');
        }
      };

      // For dialogue blurrer
      $scope.mouseOverDialogueBlurrer = function () {
        document.getElementById('dialogueblurrer').classList
          .add('dialogueblurrermouseover');
      };

      // Leave dialogue blurrer
      $scope.mouseLeaveDialogueBlurrer = function () {
        document.getElementById('dialogueblurrer').classList
          .remove('dialogueblurrermouseover');
      };

      // Assigns mouseover to a proposition and keeps track of which proposition has the mouse over
      $scope.mouseOver = function (proposition) {
        $scope.mousedOverProposition = proposition;
        $scope.mousedOverProposition.mouseOver = true;
      };

      // Clears upon mouseleave
      $scope.mouseLeave = function () {
        $scope.mousedOverProposition = {};
      };

      // Clears the selected proposition and paragraph
      $scope.clearSelectedProposition = function () {
        $scope.selectedProposition = null;
        $scope.selectedParagraph = null;
      };

      // Selects right editable span
      $scope.selectRight = function (proposition, paragraph) {
        // console.log("select right")
        focusFactory(proposition.id);
        $scope.whatHasBeenClicked = proposition.id;
        $scope.unHighlightParagraph();


      };

      $scope.assignRightFocus = function (proposition) {
        console.log("Assign right focus")
        $scope.hasRightFocus.id = proposition.id;
      };

      // Selects left editable span
      $scope.selectLeft = function (proposition, paragraph) {
        console.log("select left")
        $scope.selectedProposition = proposition;
        $scope.unHighlightParagraph();
      };

      // Selects node
      $scope.selectNode = function (node) {
        $scope.selectedNode = node;

      };

      // Selects paragraph
      $scope.selectParagraph = function (paragraph) {
        // $timeout(function () {
        //   $scope.$apply(function () {
            $scope.selectedParagraph = paragraph;
            paragraph.cursor = false;
        //   });
        // }, 0);

      };

      $scope.scrollAndClick = function (id){
        // var elmnt = document.getElementById(id);


      }

      $scope.calcColors = function (payload) {
              if ($scope.data[0].authorTable.length == 0){

                $scope.data[0].authorTable = [
                  {
                        authorId: angular.copy(payload.author),
                        color: 'lightgray'
                  }
                ]
                if (payload.author === $scope.userId){
                  $scope.userColor = 'lightgray';
                }
                var payloadColor= 'lightgray';
                console.log("Calc colors if: ", payloadColor)
              } else {
                // loop through author table



                for (var i = 0; i < $scope.data[0].authorTable.length; i++){
                  if ($scope.data[0].authorTable[i].authorId === payload.author){
                    var payloadColor = $scope.data[0].authorTable[i].color;
                    var colorAssigned = true;
                    console.log("Calc colors else lookup: ", payloadColor)
                    break;
                  }
                  // it pulled the color from the table and assigned it
                }
                if (!colorAssigned){


                  var payloadColor = $scope.otherPastels[$scope.data[0].authorTable.length -1];

                  console.log("Calc colors not assigned: ", payloadColor)

                  $scope.data[0].authorTable.push({
                    authorId: payload.author,
                    color: angular.copy(payloadColor)
                  })
                  if (payload.author === $scope.userId){
                    $scope.userColor = payloadColor;
                  }
                }
              }
              console.log("Author table: ", $scope.data[0].authorTable)
              return payloadColor;
      }

      // Makes a new left id and focuses on it
      $scope.clearLeftAdd = function (paragraph) {
        setTimeout(function () {
          // $scope.$apply(function () {
          paragraph.leftAdd = false;
          $scope.tempStopEditable = false;
          // });
        }, 5);
      }

      $scope.makeTitleEditable = function() {
        console.log("Making title editable")
        document.getElementById('apptitle').contenteditable = true;
      }

      $scope.clearWithLeftAdder = function (id) {
        $scope.unHighlightNode();

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.hasLeftFocus.id = id;
            focusFactory('left'+id);
            if ($scope.editing){
              $scope.clearEditing();
            }
          });
        }, 5);
      };

      $scope.assignLeftId = function (id) {
        setTimeout(function () {
          $scope.$apply(function () {
            $scope.hasLeftFocus.id = id;
          });
        }, 20);
      }

      // Manages top adder selection
      $scope.clearWithTopAdder = function (paragraph) {
        $scope.unHighlightNode();
        $timeout(function () {
          $scope.$apply(function () {
            $scope.selectedProposition = {};
            $scope.selectedProposition.textSide = true;
            $scope.topAdderId = IdFactory.next();
            $scope.hasTopFocus = paragraph.paragraphId;
            focusFactory($scope.topAdderId);
          });
        }, 0);
      };

      $scope.clearWithTopNodeAdder = function (node) {
        $timeout(function () {
          $scope.$apply(function () {
            node.topNodeAdd = true;
            $scope.selectedNode = node;
            $scope.selectedProposition = {};
            $scope.selectedProposition.textSide = true;
            $scope.topNodeAdderId = IdFactory.next();
            $scope.hasTopNodeFocus = node.nodeId;
            focusFactory($scope.topNodeAdderId);
          });
        }, 0);
      };

      $scope.clearWithBottomNodeAdder = function (node) {
         $scope.unHighlightNode();
        $timeout(function () {
          $scope.$apply(function () {
            node.bottomNodeAdd = true;
            $scope.selectedNode = node;
            $scope.selectedProposition = {};
            $scope.selectedProposition.textSide = true;
            $scope.bottomNodeAdderId = IdFactory.next();
            $scope.hasBottomNodeFocus = node.nodeId;
            focusFactory($scope.bottomNodeAdderId);
          });
        }, 0);
      };

      // Manages bottom adder selection
      $scope.clearWithBottomAdder = function (paragraph) {
        $scope.unHighlightNode();
        $timeout(function () {
          $scope.$apply(function () {
            paragraph.bottomAdd = true;
            $scope.hasBottomFocus.id = paragraph.paragraphId;
            $scope.selectedProposition = {};
            $scope.selectedProposition.textSide = true;
            focusFactory(paragraph.paragraphId);
          });
        }, 0);
      };


      $scope.findFirstProposition = function (paragraph, id) {

        for (var i = 0; i < paragraph.propositions.length; i++) {
          if (paragraph.propositions[i][$scope.userId] !== 'hidden' && paragraph.propositions[i].hiddenForAll !== true) {
            if (paragraph.propositions[i].id === id) {
              return true;
            } else {
              return false;
            }
          }
        }
      };

      $scope.getLastSentenceInParagraph = function (paragraph){
        return
      }

      $scope.reverseCarriageReturn = function (node, paragraph) {
        var visibleRemarkFound;
        for (var i = paragraph.propositions.length - 1; i > -1; i--) {
          for (var j = paragraph.propositions[i].remarks.length - 1; j > -1; j--){
            if (paragraph.propositions[i].remarks[j][$scope.userId] !== 'hidden' &&
            paragraph.propositions[i].remarks[j].hiddenForAll !== true){
              visibleRemarkFound = true;
              var query = paragraph.propositions[i].remarks[j].id;
              $timeout(function () {
                $('#proposition' + query).trigger('click');
              }, 0);
              break;
            }
          }
          if (!visibleRemarkFound){
            if (paragraph.propositions[j][$scope.userId] !== 'hidden' &&
            paragraph.propositions[i].hiddenForAll !== true){
              var query = paragraph.propositions[i].id;
              $timeout(function () {
                $('#proposition' + query).trigger('click');
              }, 0);
              break;
            }
          }
        }
      };

      $scope.carriageReturn = function (node, paragraph) {
          console.log("Carriage return")
          for (var i = paragraph.propositions.length - 1; i > -1; i--) {
            if (paragraph.propositions[i][$scope.userId] !== 'hidden' &&
              paragraph.propositions[i].hiddenForAll !== true &&
              $scope.selectProposition.type !== 'blank') {

                document.getElementById($scope.selectedProposition.id).innerText = '';
                $scope.selectedProposition = {};
                var query = paragraph.paragraphId;
                $timeout(function () {
                  $('#' + query).trigger('click');
                }, 0);
                console.log("Carriage return to return")
                return;

            }
          }

      };

      // Selects proposition (propositions are often selected without this function)
      $scope.selectProposition = function (proposition) {
        if ($scope.selectedProposition) {
          if ($scope.selectedProposition.id !== proposition.id) {
            $scope.clearPropositionInput();
            $scope.selectedProposition = proposition;
            focusFactory($scope.selectedProposition.id);
          } else {
            $scope.selectedProposition = proposition;
            focusFactory($scope.selectedProposition.id);
          }
        } else {
          $scope.selectedProposition = proposition;
          focusFactory($scope.selectedProposition.id);
        }
        $scope.highlight.id = '';
        $scope.highlight.highlit = null;
        $scope.mark.id = '';
        $scope.mark.marked = null;
        $scope.mark = {};
        $scope.highlight = {};
      };

      // Clears the proposition input, like when clicked away
      $scope.clearPropositionInput = function () {

        $scope.inputs.proposition = '';
        $scope.inputs.Leftproposition = '';
        $scope.highlight.id = '';
        $scope.mark.id = '';
      };

      // Highlights all of another's propositions in a paragraph, first backspace
      $scope.highlightAllPropositions = function (node, paragraph, proposition) {
        $scope.selectedParagraph.highlightAll = true;
      };

      // Marks all of another's propositions in a paragraph, second backspace
      $scope.markAllPropositions = function () {
        console.log("Mark all props")
        $scope.selectedParagraph.markAll = true;
        $scope.selectedParagraph.highlightAll = false;
      };


      // Defines what's been highlighted
      $scope.highlightProposition = function (node, paragraph, proposition) {
        console.log("Highlight proposition")
        console.log("The proposition: ", proposition)
        if ($scope.highlight.id !== proposition.id) {
          $scope.highlight.id = proposition.id;
          $scope.highlight.highlit = true;
        }
        console.log("Highlight id: ", $scope.highlight.id)
      };

      // Defines what's been marked for deletion with additional backspace
      $scope.markProposition = function (proposition) {
        $scope.mark.id = proposition.id;
        $scope.mark.marked = true;
      };

      $scope.toggleRemarksExpansion = function (proposition){
        proposition.remarksExpanded = !proposition.remarksExpanded;
      }

      // Processes incomplete edits to one's own propositions
      $scope.clearEditable = function () {
        if ($scope.whatHasBeenClicked) {
          for (var i = 0; i < $scope.propositions.length; i++) {
            console.log("Going into props array")
            if ($scope.whatHasBeenClicked === $scope.propositions[i].id) {
              console.log("If props array")
              // is either clearing what has been clicked or somehow made the proposition inaccessible
              document.getElementById('proposition' + $scope.whatHasBeenClicked).innerText = $scope.propositions[i].text;
            }
          }
          document.getElementById('proposition' + $scope.whatHasBeenClicked).contentEditable = false;
          $scope.whatHasBeenClicked = '';
        }
      };

      $scope.alternateSensor = function (proposition) {
        // console.log("Proposition object: ", proposition)

        // console.log("did the other click")
      }

      // For when there is a single click on a proposition
      $scope.listenForDoubleClick = function (element, paragraph, proposition) {
        if (($scope.cancelListenForDoubleClick === true && !$scope.draggingNode &&
          !$scope.draggingParagraph && !$scope.draggingProposition) ||
          ($scope.tempStopEditable && $scope.whatHasBeenClicked === proposition.id)) {
          console.log("returning listen for double click")

          $scope.cancelListenForDoubleClick = false;
          $scope.selectRight(proposition, paragraph);
          return;
        }
        var string = 'proposition';
        var id = proposition.id;
        string = string + id;
        $scope.selectedParagraph = paragraph;
        $scope.selectedProposition = proposition;
        $scope.selectedProposition.textSide = true;
        $scope.selectedProposition.dialogueSide = false;
        $scope.selectedParagraph.highlightAll = false;
        $scope.selectedParagraph.markAll = false;
        if (!$scope.dontrunfocusout){
          focusFactory(id);
          if ($scope.editing){
            $scope.clearEditing();
          }
        }




        if ($scope.whatHasBeenClicked !== proposition.id && !$scope.tempStopEditable) {
          document.getElementById(string).contentEditable = true;
          $scope.whatHasBeenClicked = proposition.id;
          $scope.dontrunfocusout = true;
          $scope.tempStopEditable = false;
          focusFactory(id);
          if ($scope.editing){
            $scope.clearEditing();
          }
        } else if (!$scope.tempStopEditable){

          document.getElementById(string).contentEditable = true;
          $scope.whatHasBeenClicked = proposition.id;
          $scope.dontrunfocusout = true;
          $scope.tempStopEditable = false;
          $scope.editingCopy = angular.copy(proposition.text);
          $scope.editing = angular.copy(proposition.id);
          console.log("Entered editing")
        }

      };

      $scope.clearEditing = function (flag) {
        console.log("Clearing editing")
        console.log("Flag: ", flag)
        console.log("Editing: ", $scope.editing)
        if (!flag){
          console.log("If not")
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === $scope.editing &&
                  !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                  setTimeout(function () {
                    $scope.$apply(function () {
                      console.log("Resetting")
                      if ($scope.editingCopy){
                        $scope.data[0].nodes[i].paragraphs[j].propositions[k].text = $scope.editingCopy;
                      }
                      $scope.editing = '';
                      $scope.editingCopy = '';

                    });
                  }, 5);
                  // document.getElementById('proposition' + $scope.data[0].nodes[i].paragraphs[j].propositions[k].id).innerText = $scope.editingCopy;
                  
                  return;
                }
              }
            }
          }
        } else {
          console.log("Editing else")
          $scope.editing = '';
          $scope.editingCopy = '';
        }
        
      }

      // Backstops something about proposition editability
      $scope.focusouteditable = function (element, proposition) {
        console.log("Focu sou editable")
        if ($scope.dontrunfocusout) {
          return;
        }
        element.contentEditable = false;
        $scope.whatHasBeenClicked = '';
        document.getElementById('proposition' + proposition.id).innerText = proposition.dialogueText;
        console.log('El: ', document.getElementById('proposition' + proposition.id));
      };

      // Processes an edit to one's own proposition
      $scope.updateProposition = function (node, paragraph, proposition) {
        // In case an edit out of bounds occurs
        if (proposition.author !== $scope.userId) {
          return;
        }
        // Turns off editability and gets paths to the proposition and paragraph being edited
        var elem = document.getElementById('proposition' + proposition.id);
        elem.contentEditable = false;
        if (elem) {


          var somePath;
          var nodePath;
          var paragraphPath;
          var propositionPath;
          var remarkPath;
          var text = '';





          // var propositionDestination = eval(propositionPath);
          // Copies the current status of the span
          text = angular.copy(elem.textContent);
          text = text.replace(/\u00a0/g, ' ');
          $scope.whatHasBeenClicked = '';
          // Updates the propositions array
          // Defines the payload to be emitted
          prep.payload = {
            nodeId: node.nodeId,
            paragraphId: paragraph.paragraphId,
            id: proposition.type === 'assertion' ? proposition.id : undefined,
            remarkId: proposition.type === 'negation' ? proposition.id : undefined,
            text: text,
            bookId: $scope.bookId
          };
          // Emits it, clears a variable
          chatSocket.emit('update', $scope.userId, prep.payload, $scope.bookId);
          console.log('Payload of update: ', prep.payload);
          prep = {};
          
          $scope.clearEditing('dontreset');
          
        }
      };

      // Listener for updates
      $scope.$on('socket:broadcastUpdate', function (event, payload) {
        if (payload.bookId !== $scope.bookId) {
          return;
        }
        // Looks up proposition in the propositions array, updates it



        // var index = $scope.propositions.findIndex(function (x) {
        //   return x.id === payload.id;
        // });
        var elem = document.getElementById('proposition' + payload.id);

        if (payload.remarkId){
          var elem = document.getElementById('remark' + payload.remarkId);
        } else if (payload.id){
          var elem = document.getElementById('proposition' + payload.id);
        }

        // Updates text for the proposition in the text

        if (!payload.remarkId){
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.id &&
                  !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].text = payload.text;
                  if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks){
                    for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                      $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].hiddenForAll = true;
                    }
                    break;
                  }
                }
                
              }
            }
          }
        } else {
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].id === payload.remarkId){
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].text = payload.text;
                  }
                }
              }
            }
          }
        }

        for (var i = 0; i < $scope.data[0].dialogue.length; i++){
          if ($scope.data[0].dialogue[i].id === payload.id){
            $scope.messageToCopy = angular.copy($scope.data[0].dialogue[i]);
            $scope.messageToCopy.text = payload.text;
            $scope.data[0].dialogue.splice(i, 1);
            break;
          }
        }



        $scope.data[0].dialogue.push($scope.messageToCopy);
        $scope.messageToCopy = {};

        if (payload.author === $scope.userId) {
          $timeout(function () {
            elem.click();
          }, 0);
        }
        apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
        apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
        profileService.setSelectedBook($scope.data[0]);
      });

      $scope.dragNode = function (node, e) {
        setTimeout(function () {
          $scope.$apply(function () {
            console.log("Dragging node: ", node)
            $scope.cancelListenForDoubleClick = true;
            $scope.cancelDrop = true;
            $scope.draggingNode = true;
            $scope.draggedNode = angular.copy(node);
            $scope.draggedNode.isDraggedNode = true;
            $scope.draggingParagraph = false;
            $scope.draggedParagraph = {};
            $scope.draggingProposition = false;
            $scope.draggedProposition = {};
            // document.getElementById('dragelement').append(document.getElementById('nodetitle' + $scope.draggedNode.nodeId ));
            $scope.dragStrings.push(
              {
                text: node.topic
              }
            )
            setTimeout(function () {
              $scope.$apply(function () {

                document.getElementById('dragelement').style.left = ((parseInt(e.pageX) * 1.33) + 10).toString() + 'px';
                document.getElementById('dragelement').style.top = (parseInt(e.pageY) * 1.33).toString() + 'px';


              });
            }, 5);
          }, 20);
        })
      }



      $scope.dragParagraph = function (node, paragraph, e) {
        $scope.draggingParagraph = true;
        setTimeout(function () {
          $scope.$apply(function () {
            console.log("Dragging paragraph: ", paragraph)
            $scope.cancelListenForDoubleClick = true;
            $scope.cancelDrop = true;
            $scope.draggedParagraph = paragraph;
            $scope.draggedParagraph.isDraggedParagraph = true;

            $scope.draggingNode = false;
            $scope.draggedNode = node;
            $scope.draggingProposition = false;
            $scope.draggedProposition = {};
            $scope.draggedProps = [];

            for (var i = 0; i < paragraph.propositions.length; i++){
              if (!paragraph.propositions[i].hiddenForAll){
                paragraph.propositions[i].isPresentlyBeingDragged = true;
                $scope.draggedProps.push(angular.copy(paragraph.propositions[i]));

              }
            }

            for (var i = 0; i < paragraph.propositions.length; i++){
              if (!paragraph.propositions[i].hiddenForAll){
                $scope.dragStrings.push(
                  {
                    text: (paragraph.propositions[i].text + ' ')
                  }
                )

              }
              for (var j = 0; j < paragraph.propositions[i].remarks.length; j++){
                if (!paragraph.propositions[i].remarks[j].rejoined &&
                  !paragraph.propositions[i].remarks[j].hiddenForAll){
                  $scope.dragStrings.push(
                    {
                      text: (paragraph.propositions[i].remarks[j].text + ' ')
                    }
                  )

                }
              }
            }

            setTimeout(function () {
              $scope.$apply(function () {

                document.getElementById('dragelement').style.left = ((parseInt(e.pageX) * 1.33) + 10).toString() + 'px';
                document.getElementById('dragelement').style.top = (parseInt(e.pageY) * 1.33).toString() + 'px';


              });
            }, 5);
          });
        }, 20);
      }

      $scope.dragProposition = function (node, paragraph, proposition, e) {
        if ($scope.draggingProposition){
          console.log("returning dragging prop")
          return;
        }
        // rewrite for reorderings
        $scope.draggingProposition = true;
        setTimeout(function () {
          $scope.$apply(function () {
            console.log("Dragging proposition")
            document.getElementById(proposition.id).contentEditable = false
            document.getElementById(proposition.id).blur();
            window.getSelection().removeAllRanges();
            $scope.cancelListenForDoubleClick = true;
            $scope.cancelDrop = true;
            $scope.draggedNode = node;
            $scope.draggedNode = node;
            $scope.draggedParagraph = paragraph;
            $scope.draggedParagraph.isDraggedParagraph = true;
            $scope.draggedProposition = angular.copy(proposition);
            $scope.draggedProps = [angular.copy(proposition)];
            $scope.dragStrings.push(
              {
                text: proposition.text
              }
            )
            if (proposition.remarks){
              for (var i = 0; i < proposition.remarks.length; i++){
                if (!proposition.remarks[i].hiddenForAll){
                  $scope.dragStrings.push({
                    text: angular.copy(proposition.remarks[i].text)
                  })
                }
              }
            }

            setTimeout(function () {
              $scope.$apply(function () {

                document.getElementById('dragelement').style.left = ((parseInt(e.pageX) * 1.33) + 10).toString() + 'px';
                document.getElementById('dragelement').style.top = (parseInt(e.pageY) * 1.33).toString() + 'px';


              });
            }, 5);
          });
        }, 20);
      };

      $scope.selectNodeById = function (id) {

      }

      $scope.clearDrag = function () {
        console.log("clearing drag")
        setTimeout(function () {
          $scope.$apply(function () {
            if ($scope.draggingParagraph) {
              for (var i = 0; i < $scope.draggedParagraph.propositions.length; i++){
                if ($scope.draggedParagraph.propositions[i].isPresentlyBeingDragged){

                  $scope.draggedParagraph.propositions[i].isPresentlyBeingDragged = false;
                }
              }



            } else if ($scope.draggingNode){
              $scope.draggedNode.isPresentlyBeingDragged = false;
            } else if ($scope.draggingProposition) {
              for (var i = 0; i < $scope.draggedParagraph.propositions.length; i++){
                if ($scope.draggedParagraph.propositions[i].isPresentlyBeingDragged){

                  $scope.draggedParagraph.propositions[i].isPresentlyBeingDragged = false;
                }
              }
            }
            $scope.cancelListenForDoubleClick = false;
            $scope.selectedProposition = {};
            $scope.draggedNode = {};
            $scope.draggedParagraph = {};
            $scope.draggedProposition = {};
            $scope.draggingNode = false;
            $scope.draggingParagraph = false;
            $scope.draggingProposition = false;
            $scope.dragStrings = [];
            $scope.dragStrings = [];
            $scope.paragraphMouseIsOver = {};
          });
        }, 20);
      };

      $scope.topNodeClick = function (node, event) {
        // $scope.$apply(function () {
          node.topNodeAdd = true;
          setTimeout(function () {
            document.getElementById($scope.topNodeAdderId).click();
            event.stopPropagation();
          }, 20);
        // });


      }

      $scope.bottomNodeClick = function (node, event) {
          node.bottomNodeAdd = true;
          node.minimized = true;
          setTimeout(function () {

            document.getElementById($scope.bottomNodeAdderId).click();
            event.stopPropagation();
          }, 20);



      }

      $scope.checkIfDropValid = function (node, paragraph, proposition, flag){




        if ($scope.data[0].documentClaimedBy !== $scope.userId && flag !== 'right'){

          return false;
        }
        var check = {};

        // if the blank paragraph is there, only allow rights
        if (!node.paragraphs[0].hiddenForAll && flag !== 'right' && flag !== "topnode" && flag !== 'bottomnode'){

          return false;
        }

        if ((flag === 'top' && paragraph.first && paragraph.topMouseOver)){
          if ($scope.draggingParagraph){
            if ($scope.draggedParagraph.paragraphId === paragraph.paragraphId){
              return false;
            } else {
              return true;
            }
          } else if ($scope.draggingProposition) {
            var thisCounter = 0;
            for (var i = 0; i < $scope.draggedParagraph.propositions.length; i++){
              if (!$scope.draggedParagraph.propositions[i].hiddenForAll){
                thisCounter++;
              }
            }

            if (thisCounter > 1 || $scope.draggedParagraph.paragraphId !== paragraph.paragraphId){

              return true;
            } else {

              return false;
            }
          } else if ($scope.draggingNode) {
            return false;
          } else {
            // mouseover code
            return true;
          }

        } else if (flag === 'bottom' && paragraph.bottomMouseOver) {
          if ($scope.draggingNode){
            return false;
          } else if ($scope.draggingParagraph){
            if ($scope.draggedParagraph.paragraphId === paragraph.paragraphId){
              return false;
            } else {
              return true;
            }
          } else if ($scope.draggingProposition){
            if ($scope.draggedParagraph.paragraphId === paragraph.paragraphId){
              var validityCounter = 0;
              for (var i = 0; i < $scope.draggedParagraph.propositions.length; i++){
                if (!$scope.draggedParagraph.propositions[i].hiddenForAll){
                  validityCounter++;
                }
              }
              if (validityCounter > 1){
                return true;
              } else {
                return false;
              }

            } else {
              return true;
            }
          } else {
            // mouseover code
            return true;
          }


        } else if (flag === 'left' && proposition.leftMouseOver){
          if ($scope.draggingNode){
            return false;
          } else if ($scope.draggingParagraph){
            if ($scope.draggedParagraph.paragraphId === paragraph.paragraphId){
              return false;
            } else {
              return true;
            }
          } else if ($scope.draggingProposition){
            if ($scope.draggedProposition.id === proposition.id){
              return false;
            } else {
              return false;
            }
          } else {
            return true;
          }

        } else if (flag === 'right' && proposition.mouseOver){
          if ($scope.draggingNode){
            return false;
          } else if ($scope.draggingParagraph){
            if ($scope.draggedParagraph.paragraphId === paragraph.paragraphId){
              return false;
            } else {
              return true;
            }
          } else if ($scope.draggingProposition){
            if ($scope.draggedProposition.id === proposition.id){
              return false;
            } else {
              return false;
            }
          } else {
            return true;
          }


        } else if (flag === 'topnode' && node.topDropzoneMouseOver){
          if ($scope.draggingNode && node.nodeId !== $scope.draggedNode.nodeId){
            return true;
          } else if ($scope.draggingParagraph){
            return false;
          } else if ($scope.draggingProposition){
            return false;
          } else {
            return false;
          }
        } else if (flag === 'bottomnode' && node.bottomDropzoneMouseOver){
          if ($scope.draggingNode && node.nodeId !== $scope.draggedNode.nodeId){

            return true;
          } else if ($scope.draggingParagraph){

            return false;
          } else if ($scope.draggingProposition){

            return false;
          } else {

            return false;
          }
        } else {
          return false;
        }

      }

      $scope.didItRun = function (id) {
        // $scope.hasChatFocusId = id;
        console.log("It ran")
      }

      $scope.didItRunOk = function (id) {
        console.log("It ran okay")
      }

      $scope.getReading = function (event, id) {
        var relX = event.pageX - $('#propositionsol' + id).offset().left;
          var relY = event.pageY - $('#propositionsol' + id).offset().top;
          console.log(relX, ", ", relY)
          // console.log('height: ', $('#propositionsol' + id).height)
      }

      $scope.getPropReading = function (event, proposition) {
        if ($scope.userId !== $scope.data[0].documentClaimedBy){
          console.log("Not author li click");
          return;
        }
        var relX = event.pageX - $('#wholeprop' + proposition.id).offset().left;
          var relY = event.pageY - $('#wholeprop' + proposition.id).offset().top;
          if (relX < -14 && proposition.first){
            setTimeout(function () {
              document.getElementById('leftadder'+ proposition.id).click();
            }, 20);
            
          }
          console.log(relX, ", ", relY)
          // console.log('height: ', $('#wholeprop' + proposition.id).height)
      }

      $scope.dropItem = function (node, paragraph, proposition, flag, element, event) {
        if (flag === 'ol'){
          //
        }
        console.log("Flag: ", flag)
        console.log("Element: ", element ? element : '')
        console.log("Event: ", event ? event : '')
        // console.log("That element: ", $('#paragraphsol' + paragraph.paragraphId))
        if (element && event && flag === 'ol'){
          var relX = event.pageX - $('#propositionsol' + paragraph.paragraphId).offset().left;
          var relY = event.pageY - $('#propositionsol' + paragraph.paragraphId).offset().top;
          console.log(event.pageX, ", ", event.pageY)
          console.log($('#propositionsol' + paragraph.paragraphId).offset().left, ", ", $('#propositionsol' + paragraph.paragraphId).offset().top)
          console.log(relX, ", ", relY)
          if (relY > -24){
            console.log("left ol")
            flag = 'left';
            for (var i = 0; i < paragraph.propositions.length; i++){
              if (!paragraph.propositions[i].hiddenForAll){
                proposition = paragraph.propositions[i];
                flag = 'right';
              }
            }
          } else {
            console.log("right ol")
            for (var i = paragraph.propositions.length-1; i > -1; i--){
              if (!paragraph.propositions[i].hiddenForAll){
                proposition = paragraph.propositions[i];
                flag = 'right';
              }
            }
          }
        }

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.dragStrings = [];
            $scope.targetNode = node;


            if ($scope.draggingNode){
              $scope.deleteProposition($scope.draggedNode, null, null, null, 'node', true);
              setTimeout(function () {
                // prepProposition = function (input, node, paragraph, proposition, event, draggedProps, propositionToSetLaterPosition)
                $scope.prepProposition($scope.draggedNode.topic, node, paragraph, proposition, null, flag);

                // $scope.prepProposition = function (input, thread, proposition, paragraph, event, draggedProps)
                $scope.draggedNode = {};
                $scope.draggedParagraph = {};
                $scope.draggedProposition = {};
                $scope.draggingNode = null;
                $scope.draggingParagraph = null;
                $scope.draggingProposition = null;
                $scope.cancelListenForDoubleClick = false;
              }, 20);

            } else if ($scope.draggingParagraph){
              for (var i = 0; i < $scope.draggedParagraph.propositions.length; i++){
                if ($scope.draggedParagraph.propositions[i].isPresentlyBeingDragged){
                  $scope.draggedParagraph.propositions[i].isPresentlyBeingDragged = false;
                }
              }
              $scope.deleteProposition($scope.draggedNode, $scope.draggedParagraph, null, null, 'paragraph', true);
              setTimeout(function () {
                // prepProposition = function (input, node, paragraph, proposition, event, draggedProps, propositionToSetLaterPosition)
                $scope.prepProposition(null, node, paragraph, proposition, null, flag);

                // $scope.prepProposition = function (input, thread, proposition, paragraph, event, draggedProps)
                $scope.draggedNode = {};
                $scope.draggedParagraph = {};
                $scope.draggedProposition = {};
                $scope.draggingNode = null;
                $scope.draggingParagraph = null;
                $scope.draggingProposition = null;
                $scope.cancelListenForDoubleClick = false;
              }, 20);
            } else if ($scope.draggingProposition){
              if (flag === 'left'){
                console.log("Flag is left")
                if (proposition.id === $scope.draggedProposition.id){
                  $scope.cancelListenForDoubleClick = false;
                  paragraph.leftAdd = false;
                  $scope.clearDrag();
                  console.log("Returning for invalid left drop")
                  return;
                }
              }

              $scope.deleteProposition($scope.draggedNode, $scope.draggedParagraph, $scope.draggedProposition, null, 'proposition', true);
              setTimeout(function () {
                // prepProposition = function (input, thread, proposition, paragraph, event, draggedProps, propositionToSetLaterPosition)
                $scope.prepProposition($scope.draggedProposition.text, node, paragraph, proposition, null, flag);
                $scope.draggedNode = {};
                $scope.draggedParagraph = {};
                $scope.draggedProposition = {};
                $scope.draggingNode = null;
                $scope.draggingParagraph = null;
                $scope.draggingProposition = null;

                $scope.cancelListenForDoubleClick = false;
              }, 20);
            }



            if (flag === 'left'){
              paragraph.leftAdd = true;
            }



            if ($scope.cancelDrop) {
              $scope.cancelDrop = false;
            }
            if (proposition) {
              if (proposition.id === $scope.draggedProposition.id && flag === 'right') {
                $scope.clearDrag();
                return;
              }
            }
            apply = {};
            // deleteProposition(node, paragraph, proposition, remark, modifier, dropflag)

          });
        }, 20);
      };

      // $scope.highlightNode = function (node){
      //   console.log("Highlight node")
      //   for (var i = 0; i < $scope.data[0].nodes.length; i++){
      //     for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
      //       for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
      //         $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = true;
      //         for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
      //           $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = true;
      //         }
      //       }
      //     }
      //   }

      // }

      $scope.highlightParagraph = function (node, paragraph){
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

            if (paragraph.paragraphId === $scope.data[0].nodes[i].paragraphs[j].paragraphId){

              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = true;
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = true;
                }
              }
            }
          }
        }
        $scope.thereIsAHighlightedParagraph = true;
        $scope.highlightedParagraph = paragraph;
        $scope.highlightedParagraphNode = node;
      }

      $scope.unHighlightParagraph = function (){
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){


              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].marked = false;
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = false;
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].marked = false;
                }
              
            }
          }
        }
        $scope.thereIsAHighlightedParagraph = false;
        $scope.highlightedParagraph = {};
        $scope.highlightedParagraphNode = {};
      }

      $scope.highlightNode = function (node){
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          if (node.nodeId === $scope.data[0].nodes[i].nodeId){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = true;
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = true;
                }
              }
            }
          }
        }
        $scope.thereIsAHighlightedNode = true;
        $scope.highlightedNode = node;
        console.log("Highlighted node: ", $scope.highlightedNode)
      }

      $scope.unHighlightNode = function (){
        if ($scope.thereIsAHighlightedNode){
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            if ($scope.data[0].nodes[i].nodeId === $scope.highlightedNode.nodeId){
              for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                  for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = false;
                  }
                }
              }
            }
          }
        }
        
        $scope.thereIsAHighlightedNode = false;
        $scope.highlightedNode = {};
        console.log("Highlighted node: ", $scope.highlightedNode)
      }

      $scope.markNode = function (){
        console.log("Mark node")
        console.log("Highlighted node: ", $scope.highlightedNode)
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          if ($scope.highlightedNode.nodeId === $scope.data[0].nodes[i].nodeId){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].marked = true;
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = false;
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].marked = true;
                }
              }
            }
          }
          
        }
        $scope.thereIsAMarkedNode = true;
        $scope.markedNode = angular.copy($scope.highlightedNode)
        $scope.highlightedNode = {};
        
        $scope.thereIsAHighlightedNode = false;
        console.log("Marked node: ", $scope.markedNode)

      }

      $scope.markParagraph = function (){
        console.log("marking paragraph")
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
            if ($scope.highlightedParagraph.paragraphId === $scope.data[0].nodes[i].paragraphs[j].paragraphId){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].marked = true;
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = false;
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].marked = true;
                }
              }
            }
          }
        }
        console.log('The highlighted paragraph: ' ,$scope.highlightedParagraph)
        $scope.thereIsAHighlightedParagraph = false;
        $scope.thereIsAMarkedParagraph = true;
      }

      $scope.deleteProposition = function (node, paragraph, proposition, remark, modifier, dropflag) {
        console.log("Deletion")
        console.log('Node: ', node)
        console.log('Paragraph: ', paragraph)
        console.log('Proposition: ', proposition)
        console.log('Remark: ', remark)
        console.log('Modifier: ', modifier)
        console.log('Dropflag: ', dropflag)

        if (modifier === 'node'){
          console.log("node deletion")
          if ($scope.draggingNode){
            console.log("if dragging node")
            prep.sectionNumber = $scope.draggedNode.sectionNumber;
            prep.sectionLevel = $scope.draggedNode.sectionLevel;
            prep.nodeId = $scope.draggedNode.nodeId;
          } else {
            console.log("else dragging node")
            prep.sectionNumber = node.sectionNumber;
            prep.sectionLevel = node.sectionLevel;
            prep.nodeId = node.nodeId;
          }


          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            if ($scope.data[0].nodes[i].nodeId !== node.nodeId &&
              !$scope.data[0].nodes[i].hiddenForAll){
              prep.blankDocument = false;
              break;
            }
          }
          if (prep.blankDocument !== false){
            prep.blankDocument = true;
          }

          $scope.thereIsAMarkedNode = false;
          $scope.markedNode = {};
        } else if (modifier === 'paragraph'){
          console.log("paragraph deletion")

          prep.sectionNumber = node.sectionNumber;
          prep.paragraphId = paragraph.paragraphId;
          for (var i = 0; i < $scope.data[0].nodes[prep.sectionNumber].paragraphs.length; i++){
            if ($scope.data[0].nodes[prep.sectionNumber].paragraphs[i].paragraphId !== prep.paragraphId &&
              !$scope.data[0].nodes[prep.sectionNumber].paragraphs[i].theBlankParagraph &&
              !$scope.data[0].nodes[prep.sectionNumber].paragraphs[i].hiddenForAll){

              prep.blankNode = false;
              break;
            }
          }
          if (prep.blankNode !== false){
            prep.blankNode = true;
          }


        } else if (modifier === 'proposition'){

          console.log("prop deletion")

          prep.sectionNumber = node.sectionNumber;
          prep.paragraphId = paragraph.paragraphId;
          prep.id = proposition.id;





        } else if (modifier === 'remark'){
          console.log("remark deletion")

          prep.sectionNumber = node.sectionNumber;
          prep.nodeId = node.nodeId;
          prep.paragraphId = paragraph.paragraphId;
          prep.id = proposition.id;
          prep.remarkId = remark.id;

          if (remark.author === $scope.userId){
            prep.deletesOwnRemark = true;
          } else {
            prep.deletesOwnRemark = false;
          }

        }



        prep.payload = {
          nodeId: prep.nodeId ? prep.nodeId : undefined,
          paragraphId: prep.paragraphId ? prep.paragraphId : undefined,
          beforeParagraphId: prep.beforeParagraphId ? prep.beforeParagraphId : undefined,
          id: prep.paragraphId ? prep.id : undefined,
          remarkId: prep.remarkId ? prep.remarkId : undefined,
          blankParagraph: prep.blankParagraph ? prep.blankParagraph : undefined,
          blankNode: prep.blankNode ? prep.blankNode : undefined,
          blankDocument: prep.blankDocument ? prep.blankDocument : undefined,
          sectionNumber: prep.sectionNumber ? prep.sectionNumber : undefined,
          sectionLevel: prep.sectionLevel ? prep.sectionLevel : undefined,
          deletesOwnRemark : prep.deletesOwnRemark ? prep.deletesOwnRemark : undefined,
          nodeBlankId: IdFactory.next(),
          paragraphBlankId: IdFactory.next(),
          blankId: IdFactory.next(),
          deleter: $scope.userId,
          bookId: $scope.bookId,
          modifier: modifier,
          dropflag: dropflag,

        };

        chatSocket.emit('deletion', $scope.userId, prep.payload, $scope.bookId);
        prep = {};
        apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
        // apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
        profileService.setSelectedBook($scope.data[0]);
      };

      $scope.$on('socket:broadcastDeletion', function (event, payload) {
        console.log("Received deletion: ", payload)

        apply = {};

        if (payload.bookId !== $scope.bookId) {
          return;
        }

        if (payload.modifier === 'node'){

          $scope.data[0].nodes[payload.sectionNumber].hiddenForAll = true;
          if (payload.dropflag){
            $scope.data[0].nodes[payload.sectionNumber].droppedElsewhere = true;
          }
          for (var i = 0; i < $scope.data[0].nodes[payload.sectionNumber].paragraphs.length; i++){

            $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].hiddenForAll = true;
            if (payload.dropflag){
              $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].droppedElsewhere = true;
            }
            for (var j = 0; j < $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions.length; j++){
              $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].hiddenForAll = true;
              if (payload.dropflag){
                $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].droppedElsewhere = true;
              }
              if ($scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].remarks){
                console.log("Has remarks right")
                for (var k = 0; k < $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].remarks.length; k++){
                  $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].remarks[k].hiddenForAll = true;
                  if (payload.dropflag){
                    scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].remarks[k].droppedElsewhere = true;
                  }
                }
              }
              
            }
          }

          if ($scope.userId !== payload.author &&
            $scope.selectedNode.nodeId === payload.nodeId){
            $scope.selectedNode = {};
            $scope.selectedParagraph = {};
            $scope.selectedProposition = {};
            $scope.selectedRemark = {};
          }
        } else if (payload.modifier === 'paragraph'){
          if (!payload.blankNode){
            for (var i = 0; i < $scope.data[0].nodes.length; i++){
              for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.paragraphId){
                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll = true;
                    if (payload.dropflag){
                      $scope.data[0].nodes[i].paragraphs[j].propositions[k].droppedElsewhere = true;
                    }
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].marked = false;
                  }
                  $scope.data[0].nodes[i].paragraphs[j].hiddenForAll = true;
                  if (payload.dropflag){
                    $scope.data[0].nodes[i].paragraphs[j].droppedElsewhere = true;
                  }
                  break;
                }
              }
            }

          } else {
            for (var i = 0; i < $scope.data[0].nodes.length; i++){
              for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.paragraphId){
                  apply.i = angular.copy(i);
                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll = true;
                    if (payload.dropflag){
                      $scope.data[0].nodes[i].paragraphs[j].propositions[k].droppedElsewhere = true;
                    }
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].marked = false;
                  }
                  $scope.data[0].nodes[i].paragraphs[j].hiddenForAll = true;
                  if (payload.dropflag){
                    $scope.data[0].nodes[i].paragraphs[j].droppedElsewhere = true;
                  }
                  $scope.data[0].nodes[apply.i].paragraphs[0].hiddenForAll = false;
                  $scope.data[0].nodes[apply.i].paragraphs[0].propositions[0].hiddenForAll = false;
                  
                  break;

                }
              }
            }
            setTimeout(function () {
              document.getElementById('proposition' + $scope.data[0].nodes[apply.i].paragraphs[0].propositions[0].id).click();
            }, 20);
          }

          if ($scope.userId !== payload.author &&
            $scope.selectedParagraph.paragraphId === payload.paragraphId){
            $scope.selectedNode = {};
            $scope.selectedParagraph = {};
            $scope.selectedProposition = {};
            $scope.selectedRemark = {};
          }

        } else if (payload.modifier === 'proposition'){
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.id &&
                  !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden'){
                  apply.i = angular.copy(i)
                  apply.j = angular.copy(j);
                  apply.k = angular.copy(k);
                  if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks){
                    for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                      $scope.data[0].nodes[apply.i].paragraphs[j].propositions[k].remarks[m].hiddenForAll = true;
                      if (payload.dropflag){
                        $scope.data[0].nodes[apply.i].paragraphs[j].propositions[k].remarks[m].droppedElsewhere = true;
                      }
                    }
                  }
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll = true;
                  if (payload.dropflag){
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].droppedElsewhere = true;
                  }
                  break;
                }
              }
            }
          }

          // does it blank the paragraph, the node, and what is to be clicked?
          for (var j = 0; j < $scope.data[0].nodes[apply.i].paragraphs.length; j++){
            if ($scope.data[0].nodes[apply.i].paragraphs[j].paragraphId !== payload.paragraphId &&
              !$scope.data[0].nodes[apply.i].paragraphs[j].hiddenForAll){
           
              apply.blankNode = false;
            }
          }
          for (var k = 0; k < $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions.length; k++){
           
            if ($scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[k].id !== payload.id &&
              !$scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[k].hiddenForAll){
              
              apply.blankNode = false;
            }
          }
          if (apply.blankNode !== false){
            // you blank the node. first blank the prop's paragraph, then resurrect the blank paragraph, and click the blank prop
            $scope.data[0].nodes[apply.i].paragraphs[apply.j].hiddenForAll = true;
            if (payload.dropflag){
              $scope.data[0].nodes[apply.i].paragraphs[apply.j].droppedElsewhere = true;
            }
            $scope.data[0].nodes[apply.i].paragraphs[0].hiddenForAll = false;
            $scope.data[0].nodes[apply.i].paragraphs[0].propositions[0].hiddenForAll = false;
            apply.sorted = true;
            setTimeout(function () {
              document.getElementById('proposition' + $scope.data[0].nodes[apply.i].paragraphs[0].propositions[0].id).click();
            }, 20);

          }
          if (!apply.sorted){

            for (var k = 0; k < $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions.length; k++){
              if($scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[k].id !== payload.id &&
                !$scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[k].hiddenForAll){
                apply.blankParagraph = false;
                break;
              }
            }

            if (apply.blankParagraph === false) {
              for (var m = (apply.k-1); m > -1; m--){
                if (!$scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[m].hiddenForAll){
                  apply.thisM = angular.copy(m)
                  apply.sorted = true;
                  setTimeout(function () {

                    document.getElementById('proposition' + $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.thisM].id).click();
                  }, 20);

                  break;
                }
              }
            }


            if (apply.blankParagraph !== false){
              $scope.data[0].nodes[apply.i].paragraphs[apply.j].hiddenForAll = true;
              if (payload.dropflag){
                $scope.data[0].nodes[apply.i].paragraphs[apply.j].droppedElsewhere = true;
              }
              for (var j = (apply.j-1); j > -1; j--){
                if (!$scope.data[0].nodes[apply.i].paragraphs[j].hiddenForAll && !apply.sorted){
                  for (var k = $scope.data[0].nodes[apply.i].paragraphs[j].propositions.length-1; k > -1; k--){
                    if (!$scope.data[0].nodes[apply.i].paragraphs[j].propositions[k].hiddenForAll && !apply.sorted){

                      apply.thisJ = angular.copy(j)
                      apply.thisK = angular.copy(k)
                      apply.sorted = true;
                      setTimeout(function () {
                        document.getElementById('proposition' + $scope.data[0].nodes[apply.i].paragraphs[apply.thisJ].propositions[apply.thisK].id).click();
                      }, 20);

                      break;
                    }
                  }
                }
              }
            }
          }

          if ($scope.userId !== payload.author &&
            $scope.selectedProposition.id === payload.id){
            $scope.selectedNode = {};
            $scope.selectedParagraph = {};
            $scope.selectedProposition = {};
            $scope.selectedRemark = {};
          }

        } else if (payload.modifier === 'remark'){

          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].id === payload.remarkId){
                    apply.path = '$scope.data[0].nodes[' + i.toString() +
                    '].paragraphs[' + j.toString() + '].propositions[' + k.toString() + ']';
                   
                      apply.i = angular.copy(i)
                      apply.j = angular.copy(j)
                      apply.k = angular.copy(k)
                      apply.m = angular.copy(m)
                      $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.k].remarks[apply.m].hiddenForAll = true;
                      if (payload.dropflag){
                        $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.k].remarks[apply.m].droppedElsewhere = true;
                      }
                      for (var n = m; n > -1; n--){
                        if (!$scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.k].remarks[n].hiddenForAll &&
                          $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[n][$scope.userId] !== 'hidden' &&
                          $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[n].id !== $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].id){
                          setTimeout(function () {
                              document.getElementById('remark' + $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.k].remarks[n].id).click();
                          }, 20);
                          break;
                        }
                      }
                      setTimeout(function () {
                          document.getElementById('proposition' + $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.k].id).click();
                          
                      }, 20); 
                      break;

                  }
                }
              }
            }
          }

          if ($scope.userId !== payload.author &&
            $scope.selectedRemark.id === payload.remarkId){
            $scope.selectedNode = {};
            $scope.selectedParagraph = {};
            $scope.selectedProposition = {};
            $scope.selectedRemark = {};
          }

        }

        // assigns firsts to propositions DELETION
        if (!payload.dropflag){
          $scope.assignFirstsToNodes();
        }


        $scope.scroll = {};


        apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
        // apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
        profileService.setSelectedBook($scope.data[0]);
      });

      $scope.hideNode = function (node) {
        node[$scope.userId] = 'hidden';

        apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
        // apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
        profileService.setSelectedBook($scope.data[0]);

      };



      $scope.setNewProp = function () {
        $scope.newProp = true;
        $scope.selectedProposition = {};
        $scope.selectedParagraph = {};
      };

      $scope.updateNode = function (node) {

        // In case an edit out of bounds occurs
        if ($scope.data[0].documentClaimedBy !== $scope.userId) {
          return;
        }
        // Turns off editability and gets paths to the proposition and paragraph being edited
        if (!node){
          var elem = document.getElementById('apptitle');

        } else {
          var elem = document.getElementById('nodetitle' + node.nodeId);
        }
        elem.contentEditable = false;
        if (elem) {


          var somePath;
          var nodePath;
          var paragraphPath;
          var propositionPath;
          var remarkPath;
          var text = '';


          // Copies the current status of the span
          text = angular.copy(elem.textContent);
          text = text.replace(/\u00a0/g, ' ');
          $scope.whatHasBeenClicked = '';
          // Updates the propositions array
          // Defines the payload to be emitted
          prep.payload = {
            nodeId: node ? node.nodeId : undefined,
            text: text,
            bookId: $scope.bookId
          };
          // Emits it, clears a variable
          chatSocket.emit('nodeUpdate', $scope.userId, prep.payload, $scope.bookId);
          console.log('Payload of node update: ', prep.payload);
          prep = {};
        }
      }

      $scope.$on('socket:broadcastNodeUpdate', function (event, payload) {
        console.log("Received node update")
        if (payload.bookId !== $scope.bookId) {
          return;
        }
        // Looks up proposition in the propositions array, updates it



        // var index = $scope.propositions.findIndex(function (x) {
        //   return x.id === payload.id;
        // });
        if (payload.nodeId){
          var elem = document.getElementById('nodetitle' + payload.nodeId);
        } else {
          var elem = document.getElementById('apptitle');
        }




        // Updates text for the proposition in the section


        if (payload.nodeId){
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            if ($scope.data[0].nodes[i].nodeId === payload.nodeId){
              $scope.data[0].nodes[i].topic = payload.text;
            }
          }
        } else {
          $scope.data[0].nodes[0].topic = payload.text
          $scope.title = payload.text;
        }





        apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
        apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
        profileService.setSelectedBook($scope.data[0]);
      });

      $scope.setNodeEditability = function (node) {
        console.log("Setting node editability")
        if (node){
          document.getElementById('nodetitle' + node.nodeId).contentEditable = true;
        } else {
          document.getElementById('apptitle').contentEditable = true;
        }
      }

      $scope.prepProposition = function (input, node, paragraph, proposition, event, flag ) {
        console.log("Selected proposition: ", angular.copy($scope.selectedProposition))
        if ((!input || input == '<br><br>') && !$scope.draggingParagraph){
          console.log("Returning for lack of input otherwise uncaught");
          $scope.inputs.proposition = '';
          return;
        }
        $scope.data[0].isFresh = false;
        console.log("Prepping prop: ", input)

        $scope.theseInputs.push(angular.copy(input));

        if ($scope.selectedParagraph) {
          $scope.selectedParagraph.highlightAll = false;
          $scope.selectedParagraph.markAll = false;
        }

        apply = {};

        if (proposition) {
          proposition.propositionPreSelected = false;
        }
        if (paragraph){
          paragraph.disableRightCursor = false;
        } else {
          var paragraph = $scope.selectedParagraph;
        }

        //blur active element
        document.activeElement.blur();

        if (input){
          prep.firstChar = input.charAt(0);
          prep.lastChar = input.charAt(input.length - 1);
        } else if (!$scope.draggingNode && !$scope.draggingParagraph && $scope.draggingProposition) {

          var input = $scope.draggedProposition.text;
        }

        if (prep.lastChar !== '.' && prep.lastChar !== '?' && prep.lastChar !== '!' && prep.lastChar !== ':') {
          input = input + '.';
        }
        if (paragraph){
          if (paragraph.topAdd || paragraph.bottomAdd || paragraph.leftAdd) {
            apply.textSide = true;
          }
        }
        console.log("To sieve")

        if (!paragraph){
          paragraph = {
            empty: 'data'
          }
        }

        //   Topics

        // If it's ended with a colon, or a dragged node
        // it's a topic

        if ((prep.lastChar === ':' || $scope.draggingNode || $scope.inputs.newSectionTitle) &&
          ($scope.data[0].documentClaimedBy === $scope.userId || !$scope.data[0].documentClaimedBy)) {
          console.log("One")
          prep.code = '1';
          if (prep.lastChar === ':'){
            prep.topic = input.substring(0, input.length - 1);
          } else if ($scope.draggedNode.nodeId){
            prep.topic = $scope.draggedNode.topic;
          } else if ($scope.inputs.newSectionTitle){
            prep.topic = $scope.inputs.newSectionTitle;
          }

          prep.type = 'topic';
          prep.adjustedText = '';
          prep.author = $scope.userId;
          if (flag !== 'top'){
            prep.afterNodeId = $scope.selectedNode.nodeId;
          } else if ($scope.selectedNode.sectionNumber === 0){
            prep.beforeNodeId = $scope.selectedNode.nodeId;
          }
          prep.ofNodeId = $scope.selectedNode.nodeId;
          if (flag !== 'top'){
            prep.sectionLevel = ($scope.selectedNode.sectionLevel + 1);
          } else {
            prep.sectionLevel = ($scope.selectedNode.sectionLevel);
          }

          if ($scope.draggingNode && flag === 'top'){
            prep.sectionNumber = node.sectionNumber;
          } else if ($scope.draggingNode) {
            prep.sectionNumber = node.sectionNumber + 1;
          } else {
            prep.sectionNumber = node.sectionNumber + 1;
          }

          prep.id = IdFactory.next();



          // Negations

          // If the selected proposition is not your own
          // and it's a sentence
          // Or if it's a continuation of another remark
          // it's a negation

        } else if (($scope.selectedProposition.type === 'assertion' && $scope.data[0].documentClaimedBy !== $scope.userId) ||
                ($scope.selectedProposition.type === 'negation' && $scope.selectedProposition.author === $scope.userId && !paragraph.leftAdd)) {


          if ($scope.selectedProposition.type === 'negation') {
            console.log("2b")
            prep.code = '2B';
            prep.topic = $scope.selectedProposition.topic;
            prep.type = 'negation';
            prep.adjustedText = input;
            prep.author = $scope.userId;
            prep.afterRemarkId = $scope.selectedProposition.id;
            prep.targetNodeId = $scope.selectedNode.nodeId;
            prep.targetParagraphId = $scope.selectedParagraph.paragraphId;
            prep.of = {
              type: $scope.selectedProposition.of.type,
              author: $scope.selectedProposition.of.author,
              id: $scope.selectedProposition.of.id,
              text: $scope.selectedProposition.of.text
            }
            prep.previousMessages = angular.copy($scope.selectedProposition.messagesSoFar);
            prep.previousMessages.pop();
            prep.id = IdFactory.next();
            prep.previousMessages.push(prep.id)
            prep.messagesSoFar = angular.copy(prep.previousMessages);


          } else {

            console.log("2a")
            prep.code = '2A';
            prep.topic = $scope.selectedProposition.topic;
            prep.type = 'negation';
            prep.adjustedText = input;
            prep.author = $scope.userId;
            prep.afterPropositionId = $scope.selectedProposition.id;
            prep.targetNodeId = $scope.selectedNode.nodeId;
            prep.targetParagraphId = $scope.selectedParagraph.paragraphId;
            prep.of = {
              type: $scope.selectedProposition.type,
              author: $scope.selectedProposition.author,
              id: $scope.selectedProposition.id,
              text: $scope.selectedProposition.text
            }
            prep.previousMessages = angular.copy($scope.selectedProposition.messagesSoFar);
            prep.id = IdFactory.next();
            prep.previousMessages.push(prep.id)
            prep.messagesSoFar = angular.copy(prep.previousMessages);
          }




        // Rejoinders: gone




        } else if ($scope.selectedProposition.question) {
          //won't run

        } else if ($scope.selectedProposition.type === 'negation' &&
          $scope.selectedProposition.of.type === 'assertion' &&
          $scope.selectedProposition.of.author === $scope.userId &&
          !$scope.draggingProposition &&
          !$scope.draggingParagraph){
          console.log("Prepping rejoinder")

          prep.previousMessages = angular.copy($scope.selectedProposition.messagesSoFar);
          prep.id = IdFactory.next();
          prep.previousMessages.push(prep.id)
          prep.messagesSoFar = angular.copy(prep.previousMessages);
          prep.isRejoinder = true;

          prep.capacityCount = 0;

          for (var i = 0; i < paragraph.propositions.length; i++){
            for (var j = 0; j < prep.previousMessages.length; j++){
              if (paragraph.propositions[i].type === 'assertion' &&
                paragraph.propositions[i].author === $scope.userId &&
                paragraph.propositions[i].isRejoinder &&
                paragraph.propositions[i].id === prep.previousMessages[j] &&
                j > 1){
                // If it's one of your own rejoinders in the same thread , count it
                prep.capacityCount++;
              }
            }
          }

          if (prep.capacityCount < 2){
            console.log("3a")
            prep.code = '3A';
            prep.topic = $scope.selectedProposition.topic;
            prep.type = 'assertion';
            prep.adjustedText = input;
            prep.author = $scope.userId;
            prep.afterPropositionId = angular.copy($scope.selectedProposition.of.id);
            prep.targetNodeId = $scope.selectedNode.nodeId;
            prep.targetParagraphId = $scope.selectedParagraph.paragraphId;
            prep.rejoins = $scope.selectedProposition.id;
            prep.of = {
              type: $scope.selectedProposition.type,
              author: $scope.selectedProposition.author,
              id: $scope.selectedProposition.id,
              text: $scope.selectedProposition.text
            }
          } else {
            // repeated rejoinders
            console.log("3b")
            prep.code = '3B';
            prep.topic = $scope.selectedProposition.topic;
            prep.type = 'assertion';
            prep.adjustedText = input;
            prep.author = $scope.userId;
            prep.afterPropositionId = angular.copy($scope.selectedProposition.of.id);
            prep.targetNodeId = $scope.selectedNode.nodeId;
            prep.afterParagraphId = $scope.selectedParagraph.paragraphId;
            prep.rejoins = $scope.selectedProposition.id;
            prep.of = {
              type: $scope.selectedProposition.type,
              author: $scope.selectedProposition.author,
              id: $scope.selectedProposition.id,
              text: $scope.selectedProposition.text
            }



            prep.sectionNumber = $scope.selectedNode.sectionNumber;
            prep.id = IdFactory.next();

            prep.messagesSoFar = [$scope.selectedProposition.of.id, $scope.selectedProposition.id, prep.id]
          }
        } else if ($scope.newProp){
          console.log("3c")
          prep.code = '3C';
          prep.newProp = true;
          prep.topic = $scope.selectedProposition.topic;
          prep.type = 'assertion';
          prep.adjustedText = input;
          prep.author = $scope.userId;
          prep.targetNodeId = $scope.selectedNode.nodeId;
          prep.targetSectionNumber = $scope.selectedNode.sectionNumber;
          for (var i = ($scope.data[0].nodes[prep.targetSectionNumber].paragraphs.length -1); i > -1; i--){
            if (!$scope.data[0].nodes[prep.targetSectionNumber].paragraphs[i].hiddenForAll){
              prep.afterParagraphId = $scope.data[0].nodes[prep.targetSectionNumber].paragraphs[i];
              break;
            }
          }
          prep.of = {
            type: $scope.selectedProposition.of.type,
            author: $scope.selectedProposition.of.author,
            id: $scope.selectedProposition.of.id,
            text: $scope.selectedProposition.of.type
          }

          prep.id = IdFactory.next();
          prep.messagesSoFar = [prep.id]

        } else if (paragraph.topAdd || paragraph.topMouseOver){
          console.log("3d")
          prep.code = '3D';
          prep.topic = $scope.selectedProposition.topic;
          prep.type = 'assertion';
          prep.adjustedText = input;
          prep.author = $scope.userId;
          prep.beforeParagraphId = paragraph.paragraphId;
          prep.targetNodeId = $scope.selectedNode.nodeId;
          prep.sectionNumber = $scope.selectedNode.sectionNumber;

          prep.id = IdFactory.next();
          prep.of = {
            type: 'itsown',
            author: 'itsown',
            id: 'itsown',
            text: 'itsown'
          }
          prep.messagesSoFar = [prep.id]
        } else if (paragraph.bottomAdd){

          console.log("3e")
          prep.code = '3E';
          prep.topic = $scope.selectedProposition.topic;
          prep.type = 'assertion';
          prep.adjustedText = input;
          prep.author = $scope.userId;
          if (!$scope.draggingParagraph && !$scope.draggingProposition){
            prep.afterParagraphId = $scope.selectedParagraph.paragraphId;
          } else {
            prep.afterParagraphId = angular.copy(paragraph.paragraphId);
          }
          console.log(prep.afterParagraphId, "is the after paragraph id")
          if (!$scope.draggingParagraph && !$scope.draggingProposition){
            prep.targetNodeId = $scope.selectedNode.nodeId;
          } else {
            prep.targetNodeId = angular.copy(node.nodeId);
          }
          prep.sectionNumber = $scope.selectedNode.sectionNumber;
          prep.id = IdFactory.next();
          prep.of = {
            type: 'itsown',
            author: 'itsown',
            id: 'itsown',
            text: 'itsown'
          }
          prep.messagesSoFar = [prep.id]
        } else if (paragraph.leftAdd){
          console.log("3f")
          prep.code = '3F';
          prep.topic = $scope.selectedProposition.topic;
          prep.type = 'assertion';
          prep.adjustedText = input;
          prep.author = $scope.userId;
          prep.targetParagraphId = $scope.selectedParagraph.paragraphId;
          prep.targetNodeId = $scope.selectedNode.nodeId;
          prep.sectionNumber = $scope.selectedNode.sectionNumber;
          prep.beforePropositionId = proposition.id;
          prep.id = IdFactory.next();
          prep.of = {
            type: 'itsown',
            author: 'itsown',
            id: 'itsown',
            text: 'itsown'
          }
          prep.messagesSoFar = [prep.id]
        } else if (($scope.selectedProposition.type === 'assertion' &&
          $scope.userId === $scope.data[0].documentClaimedBy) && (!$scope.draggingParagraph || proposition.type !== 'blank') && 
        (!$scope.draggingProposition || proposition.type !== 'blank')){
          console.log("3g")
          prep.code = '3G';
          prep.topic = $scope.selectedProposition.topic;
          prep.type = 'assertion';
          prep.adjustedText = input;
          prep.author = $scope.userId;
          prep.targetParagraphId = $scope.selectedParagraph.paragraphId;
          prep.targetNodeId = $scope.selectedNode.nodeId;
          prep.sectionNumber = $scope.selectedNode.sectionNumber;
          if ($scope.draggingProposition || $scope.draggingParagraph){
            prep.afterPropositionId = proposition.id;
          } else {
            prep.afterPropositionId = $scope.selectedProposition.id;
          }

          prep.id = IdFactory.next();
          prep.of = {
            type: 'itsown',
            author: 'itsown',
            id: 'itsown',
            text: 'itsown'
          }
          prep.messagesSoFar = [prep.id]

        } else if (($scope.selectedProposition.type === 'blank' &&
          $scope.userId === $scope.data[0].documentClaimedBy) ||
          !$scope.data[0].documentClaimedBy){
          console.log("4")
          prep.code = '4';
          prep.topic = $scope.selectedProposition.topic;
          prep.type = 'assertion';
          prep.adjustedText = input;
          prep.author = $scope.userId;
          
          if ($scope.draggingProposition || $scope.draggingParagraph){
            prep.targetNodeId = node.nodeId;
          } else {
            prep.targetNodeId = $scope.selectedNode.nodeId;
          }
          prep.sectionNumber = $scope.selectedNode.sectionNumber;
          console.log("The paragraph: ", paragraph)
          if ($scope.draggingProposition || $scope.draggingParagraph){
            prep.afterParagraphId = angular.copy(paragraph.paragraphId);
          } else {
            prep.afterParagraphId = $scope.selectedParagraph.paragraphId;
          }
          prep.id = IdFactory.next();
          prep.of = {
            type: 'itsown',
            author: 'itsown',
            id: 'itsown',
            text: 'itsown'
          }
          prep.messagesSoFar = [prep.id]


        } else {

          console.log("womp womp")
          return;
        }

        if (prep.code === '3E' && $scope.draggingProposition){
          console.log("Special adjustment")
          prep.savedParagraphId = angular.copy(paragraph.paragraphId);
        }


        prep.adjustedText = prep.adjustedText.replace(/&nbsp;/g, ' ');
        prep.adjustedText = angular.copy(prep.adjustedText).replace(/(&lt;br&gt;&lt;br&gt;\.|<br><br>\.)/g, '');

        if (!$scope.data[0].documentClaimedBy){
          prep.documentClaimedBy = $scope.userId;
        }

        prep.payload = {
          author: $scope.userId,
          text: prep.adjustedText,
          dialogueText: angular.copy(prep.adjustedText),
          type: prep.type,
          code: prep.code,
          topic: prep.topic,
          dialogueSide: $scope.selectedProposition.dialogueSide ? $scope.selectedProposition.dialogueSide : undefined,
          ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
          ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
          of: (prep.of ? prep.of : undefined),
          previousRemarks: prep.previousRemarks ? prep.previousRemarks: undefined,
          blankId: IdFactory.next(),
          textSide: $scope.selectedProposition.textSide ? $scope.selectedProposition.textSide : prep.textSide,
          bookId: $scope.bookId,
          nodeId: IdFactory.next(),
          paragraphId: IdFactory.next(),
          id: prep.id ? prep.id : IdFactory.next(),
          remarkId: IdFactory.next(),
          question: (prep.question ? prep.question : undefined),
          dropflag: $scope.draggedProposition.id ? true : undefined,
          draggedNode: $scope.draggedNode ? $scope.draggedNode : undefined,
          draggedProps: ($scope.draggingNode || $scope.draggingParagraph || $scope.draggingProposition) ?
            $scope.draggedProps : undefined,
          beforeNodeId: prep.beforeNodeId ? prep.beforeNodeId : undefined,
          afterNodeId: prep.afterNodeId ? prep.afterNodeId : undefined,
          replacesNodeId: prep.replacesNodeId ? prep.replacesNodeId : undefined,
          targetNodeId: prep.targetNodeId ? prep.targetNodeId : undefined,
          beforeParagraphId: prep.beforeParagraphId ? prep.beforeParagraphId : undefined,
          afterParagraphId: prep.savedParagraphId ? prep.savedParagraphId : prep.afterParagraphId ? prep.afterParagraphId : undefined,
          targetParagraphId: prep.targetParagraphId ? prep.targetParagraphId : undefined,
          beforePropositionId: prep.beforePropositionId ? prep.beforePropositionId : undefined,
          afterPropositionId: prep.afterPropositionId ? prep.afterPropositionId : undefined,
          beforeRemarkId: prep.beforeRemarkId ? prep.beforeRemarkId : undefined,
          afterRemarkId: prep.afterRemarkId ? prep.afterRemarkId : undefined,
          answeredQuestion: (prep.answeredQuestion ? prep.answeredQuestion : undefined),
          isAntecedent: (prep.isAntecedent ? prep.isAntecedent : undefined),
          isConsequent: (prep.isConsequent ? prep.isConsequent : undefined),
          sectionLevel: (prep.sectionLevel ? prep.sectionLevel : undefined),
          sectionNumber: (prep.sectionNumber ? prep.sectionNumber : undefined),
          documentClaimedBy: (prep.documentClaimedBy ? prep.documentClaimedBy : undefined),
          previousMessages: (prep.previousMessages ? prep.previousMessages : undefined),
          messagesSoFar: (prep.messagesSoFar ? prep.messagesSoFar : undefined),
          rejoins: prep.rejoins ? prep.rejoins : undefined
          // class: (prep.newClass ? prep.newClass : prep.class),
          // nodePath: (prep.nodePath ? prep.nodePath : undefined),
          // oldNodePath: (prep.oldNodePath ? prep.oldNodePath : undefined),
          // selectedParagraphId: $scope.selectedParagraph.paragraphId,
          // address: prep.address,
          // nodePath: (prep.nodePath ? prep.nodePath : undefined),
          // getsOwnNode: (prep.getsOwnNode === true ? prep.getsOwnNode : undefined),
          // getsOwnParagraph: (prep.getsOwnParagraph === true ? prep.getsOwnParagraph : undefined),
          // newProp: (prep.newProp === true ? prep.newProp : undefined),
          // insertsAbove: (prep.insertsAbove === true ? prep.insertsAbove : undefined),
          // insertsBelow: (prep.insertsBelow === true ? prep.insertsBelow : undefined),
          // insertsLeft: (prep.insertsLeft === true ? prep.insertsLeft : undefined),
          // assertionPath: (prep.assertionPath ? prep.assertionPath : undefined),
          // assertionId: (prep.assertionId ? prep.assertionId : undefined),
          // remarkAddress: (prep.remarkAddress ? prep.remarkAddress : undefined),
          // remarkPath: (prep.remarkPath ? prep.remarkPath : undefined),
          // address: prep.address,
          // paragraphPosition: prep.paragraphPosition,
          // ofParagraphPosition: (prep.ofParagraphPosition !== undefined ? prep.ofParagraphPosition : undefined),
          // isPlaceholder: (prep.isPlaceholder ? prep.isPlaceholder : undefined),
          // propositionToSetLaterPosition: propositionToSetLaterPosition !== undefined ? propositionToSetLaterPosition : undefined,
        };

        $scope.tempStopEditable = false;

        console.log("Payload: ", prep.payload)

        //      CLEARS THINGS AND EMITS THE PAYLOAD
        chatSocket.emit('proposition', $scope.userId, prep.payload, $scope.bookId);

        // when its a rejoinder
        // when there's no dragged proposition
        // when recycleRemarks is true
        if (prep.payload.type === 'negation' &&
          prep.payload.author === $scope.userId &&
          $scope.recycleRemarks &&
          !$scope.draggedProposition.id &&
          $scope.snowballSurvivesHell){
          prep.nodeDestination = eval(prep.nodePath)
          prep.remarkPayload = {};

          for (var i = 0; i < prep.nodeDestination.paragraphs.length; i++) {

            if (prep.nodeDestination.paragraphs[i].owner === $scope.userId) {

              for (var j = i + 1; j < prep.nodeDestination.paragraphs.length; j++) {

                if (prep.nodeDestination.paragraphs[j]) {
                  if (prep.nodeDestination.paragraphs[j].owner !== $scope.userId && !prep.insertsBelow) {

                    prep.remarkPayload.paragraphPosition = j;
                    prep.remarkPayload.position = 0;
                    break;
                  }


                } else {
                  prep.remarkPayload.paragraphPosition = i;
                  prep.remarkPayload.position = 0;
                  prep.remarkPayload.insertsBelow = true;
                  break;
                }
              }
            }
          }

          prep.remarkPayload = {
                    topic: prep.topic,
                    address: prep.address,
                    paragraphPosition: prep.remarkPayload.position,
                    // ofParagraphPosition: (prep.ofParagraphPosition !== undefined ? prep.ofParagraphPosition : undefined),
                    blankId: IdFactory.next(),
                    textSide: $scope.selectedProposition.textSide ? $scope.selectedProposition.textSide : apply.textSide,
                    dialogueSide: $scope.selectedProposition.dialogueSide ? $scope.selectedProposition.dialogueSide : apply.dialogueSide,
                    class: (prep.newClass ? prep.newClass : prep.class),
                    nodePath: (prep.nodePath ? prep.nodePath : undefined),
                    nodeId: IdFactory.next(),
                    oldNodePath: (prep.oldNodePath ? prep.oldNodePath : undefined),                          //    COMPOSITION OF THE PAYLOAD
                    question: (prep.question ? prep.question : undefined),
                    paragraphId: IdFactory.next(),
                    selectedParagraphId: $scope.selectedParagraph.paragraphId,
                    bookId: $scope.bookId,
                    dropflag: $scope.draggedProposition.id ? true : undefined,
                    // draggedProps: draggedProps ? draggedProps : undefined,
                    proposition: {
                      id: IdFactory.next(),
                      address: prep.address,
                      nodePath: (prep.nodePath ? prep.nodePath : undefined),
                      question: (prep.question ? prep.question : undefined),
                      answeredQuestion: (prep.answeredQuestion ? prep.answeredQuestion : undefined),
                      getsOwnNode: (prep.getsOwnNode === true ? prep.getsOwnNode : undefined),
                      getsOwnParagraph: (prep.getsOwnParagraph === true ? prep.getsOwnParagraph : undefined),
                      newProp: true,
                      insertsAbove: (prep.insertsAbove === true ? prep.insertsAbove : undefined),
                      insertsBelow: (prep.remarkPayload.insertsBelow === true ? prep.remarkPayload.insertsBelow : undefined),
                      insertsLeft: (prep.insertsLeft === true ? prep.insertsLeft : undefined),
                      assertionPath: (prep.assertionPath ? prep.assertionPath : undefined),
                      assertionId: IdFactory.next(),
                      remarkAddress: undefined,
                      remarkPath: undefined,
                      isAntecedent: (prep.isAntecedent ? prep.isAntecedent : undefined),
                      isConsequent: (prep.isConsequent ? prep.isConsequent : undefined),
                      isPlaceholder: (prep.isPlaceholder ? prep.isPlaceholder : undefined),
                      propositionToSetLaterPosition: propositionToSetLaterPosition !== undefined ? propositionToSetLaterPosition : undefined,
                      author: angular.copy(prep.of.author),
                      text: angular.copy(prep.of.text),
                      dialogueText: angular.copy(prep.of.text),
                      // above needs to be fixed for text that changes
                      type: 'assertion',
                      of: undefined,
                      position: prep.remarkPayload.position,
                      remarks: []

                    }
                  };

          chatSocket.emit('proposition', $scope.userId, prep.remarkPayload, $scope.bookId);
        }


        prep = {};


        if (paragraph) {

          paragraph.topAdd = false;
          paragraph.bottomAdd = false;
          paragraph.leftAdd = false;
          paragraph.leftMouseOver = false;
          paragraph.topMouseOver = false;
          paragraph.bottomAdd = false;
          paragraph.bottomMouseOver = false;
          // if (node.bottomNodeAdd){
          //
          // }
          if (node){
            node.topNodeAdd = false;
            node.topDropzoneMouseOver= false;
            node.bottomNodeAdd = false;
            node.bottomDropzoneMouseOver = false;
          }


        }

        $scope.hasTopFocus = '';
        $scope.hasBottomFocus = {};
        $scope.hasTopNodeFocus = '';
        $scope.hasBottomNodeFocus = '';
        $scope.hasLeftFocus = {};
        // $scope.hasRightFocus = {};
        $scope.newProp = '';
        $scope.threadAdding = '';
        $scope.draggedProps = [];
        $scope.inputs.newSectionTitle = '';
        $scope.dragStrings = [];
        $scope.dragProps = [];

      };

      $scope.$on('socket:broadcastDeletion', function (event, payload) {


        $timeout(function () {
          $scope.$apply(function () {
            $scope.propToDeleteAnimate.id = payload.id;
          }, 0);
        });

      });

      $scope.$on('socket:broadcastProposition', function (event, payload) {

        console.log("Received proposition: ", payload)

        if (!$scope.data[0].moveCounter){
          $scope.data[0].moveCounter = 0;
        }
        $scope.data[0].moveCounter++;

        if (payload.bookId !== $scope.bookId) {
          console.log("Returning for book mismatch")
          return;
        }

        $timeout(function () {
          $scope.$apply(function () {
            console.log("Inside the apply")

            // Since n users are connected, does it save to the database n times?
            if (payload.documentClaimedBy){
              $scope.data[0].documentClaimedBy = payload.documentClaimedBy;
            }

            if (payload.dropflag) {
              $scope.inputs.nothing;
            }
            if (payload.author !== $scope.userId){
              $scope.propToAddAnimate.id = payload.id;
            } else if (payload.type == 'rejoinder'){
              $scope.propToRejoinAnimate.id = payload.id;
            }


            apply = {};
            if (payload.author === $scope.userId) {
              $scope.inputs.proposition = '';
              $scope.inputs.leftProposition = '';
              $scope.inputs.chatProposition = '';
              $scope.inputs.newSectionTitle = '';
            }

            if (payload.code === '1') {

              if (!payload.beforeNodeId){
                for (var i = 0; i < $scope.data[0].nodes.length; i++){
                  if ($scope.data[0].nodes[i].nodeId === payload.ofNodeId){
                    apply.parentNode = $scope.data[0].nodes[i];
                    apply.parentNodeIndex = angular.copy(i);
                    break;
                  }
                }

                if ($scope.data[0].nodes[apply.parentNodeIndex + 1]){
                  // if theres one after
                  for (var i = $scope.data[0].nodes.length-1; i > apply.parentNodeIndex; i--){
                    $scope.data[0].nodes[i + 1] =  angular.copy($scope.data[0].nodes[i]);
                    $scope.data[0].nodes[i + 1].sectionNumber++;
                  }
                  if (!payload.draggedNode.nodeId){
                    $scope.data[0].nodes[apply.parentNodeIndex+1] = {
                      topic: payload.topic,
                      dateCreated: Date(),
                      lastModified: null,
                      nodeId: payload.nodeId,
                      minimized: false,
                      sectionLevel: payload.sectionLevel,
                      sectionNumber: payload.sectionNumber,
                      paragraphs: [
                        {
                          first: true,
                          paragraphId: payload.paragraphId,
                          theBlankParagraph: true,
                          propositions: [
                            {
                              id: payload.id,
                              type: 'blank',
                              author: '',
                              text: '',
                              remarks: [],
                              dialogueSide: false,
                              first: true,
                              messagesSoFar: payload.messagesSoFar
                            }
                          ]
                        }
                      ],
                    }
                  } else {
                    $scope.data[0].nodes[apply.parentNodeIndex+1] = angular.copy(payload.draggedNode);
                    $scope.data[0].nodes[apply.parentNodeIndex+1].sectionNumber = (apply.parentNodeIndex+1);
                  }

                } else {
                    $scope.data[0].nodes[apply.parentNodeIndex + 1] = {
                      topic: payload.topic,
                      dateCreated: Date(),
                      lastModified: null,
                      nodeId: payload.nodeId,
                      minimized: false,
                      sectionLevel: payload.sectionLevel,
                      sectionNumber: payload.sectionNumber,
                      paragraphs: [
                        {
                          first: true,
                          paragraphId: payload.paragraphId,
                          theBlankParagraph: true,
                          propositions: [
                            {
                              id: payload.id,
                              type: 'blank',
                              author: '',
                              text: '',
                              remarks: [],
                              dialogueSide: false,
                              first: true,
                              messagesSoFar: payload.messagesSoFar
                            }
                          ]
                        }
                      ],
                    }
                }

                if (!payload.draggedNode.nodeId && payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                    setTimeout(function () {
                      document.getElementById('proposition' + payload.id).click();
                  }, 20);
                }


              } else {
                for (var i = 0; i < $scope.data[0].nodes.length; i++){
                  if ($scope.data[0].nodes[i].nodeId === payload.ofNodeId){
                    apply.parentNode = $scope.data[0].nodes[i];
                    apply.parentNodeIndex = angular.copy(i);
                    break;
                  }
                }

                if ($scope.data[0].nodes[apply.parentNodeIndex - 1]){
                  for (var i = $scope.data[0].nodes.length-1; i > apply.parentNodeIndex-1; i--){
                    $scope.data[0].nodes[i + 1] =  angular.copy($scope.data[0].nodes[i]);
                    $scope.data[0].nodes[i + 1].sectionNumber++;
                  }
                  if (!payload.draggedNode){
                    $scope.data[0].nodes[apply.parentNodeIndex] = {
                      topic: payload.topic,
                      dateCreated: Date(),
                      lastModified: null,
                      nodeId: payload.nodeId,
                      minimized: false,
                      sectionLevel: payload.sectionLevel,
                      sectionNumber: payload.sectionNumber,
                      paragraphs: [
                        {
                          first: true,
                          paragraphId: payload.paragraphId,
                          theBlankParagraph: true,
                          propositions: [
                            {
                              id: payload.id,
                              type: 'blank',
                              author: '',
                              text: '',
                              remarks: [],
                              dialogueSide: false,
                              first: true,
                              messagesSoFar: payload.messagesSoFar
                            }
                          ]
                        }
                      ],
                    }
                  } else {
                    $scope.data[0].nodes[apply.parentNodeIndex] = payload.draggedNode;
                    $scope.data[0].nodes[apply.parentNodeIndex] = payload.draggedNode;
                  }

                } else {
                  // if there is one before
                  for (var i = (apply.parentNodeIndex); i < $scope.data[0].nodes.length; i++){
                    $scope.data[0].nodes[i + 1] =  $scope.data[0].nodes[i];
                  }
                  if (!payload.draggedNode){
                    $scope.data[0].nodes[apply.parentNodeIndex] = {
                      topic: payload.topic,
                      dateCreated: Date(),
                      lastModified: null,
                      nodeId: payload.nodeId,
                      minimized: false,
                      paragraphs: [
                        {
                          first: true,
                          paragraphId: payload.paragraphId,
                          theBlankParagraph: true,
                          propositions: [
                            {
                              id: payload.id,
                              type: 'blank',
                              author: '',
                              text: '',
                              remarks: [],
                              dialogueSide: false,
                              first: true,
                              messagesSoFar: payload.messagesSoFar
                            }
                          ]
                        }
                      ],
                    }
                  } else {
                    $scope.data[0].nodes[apply.parentNodeIndex] = payload.draggedNode;
                  }

                }

                if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                  setTimeout(function () {
                      document.getElementById('proposition' + payload.id).click();
                  }, 20);
                }

              }



              if ($scope.selectedNode.sectionNumber){
                // correct selecteds
              }


            } else if (payload.code === '2B'){
              console.log("2b")
              for (var i = 0; i < $scope.data[0].nodes.length; i++){

                for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                      if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.of.id){
                        apply.nodeTarget = angular.copy(i);
                        apply.paragraphTarget = angular.copy(j);
                        apply.propTarget = angular.copy(k);
                        break;
                      }

                  }
                }
              }

              $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.propTarget].remarksExpanded = true;
              $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.propTarget].remarks.unshift(
                {
                  id: payload.id,
                  type: 'negation',
                  author: payload.author,
                  text: payload.text,
                  dialogueSide: false,
                  messagesSoFar: payload.messagesSoFar,
                  previousMessages: payload.previousMessages,
                  of: payload.of
                }
              )

              if (payload.author === $scope.userId && !payload.dialogueSide){
                setTimeout(function () {
                  document.getElementById('proposition' + payload.id).click();
                }, 20);
              }

            } else if (payload.code === '2A'){
              console.log("2a received")

              for (var i = 0; i < $scope.data[0].nodes.length; i++){

                for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                    if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.of.id &&
                      !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                      apply.nodeTarget = i;
                      apply.paragraphTarget = j;
                      apply.propTarget = k;
                      console.log("About to push to i, j, k of : ", angular.copy(i)," ", angular.copy(j)," ", angular.copy(k))
                      break;
                    }
                  }
                }
              }


              console.log('Unshifting ', angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.propTarget].remarks))
              $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.propTarget].remarksExpanded = true;
              $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.propTarget].remarks.unshift(
                {
                  id: payload.id,
                  type: 'negation',
                  author: payload.author,
                  text: payload.text,
                  dialogueSide: false,
                  messagesSoFar: payload.messagesSoFar,
                  of: payload.of,

                }
              )

              if (payload.author === $scope.userId && !payload.dialogueSide){
                setTimeout(function () {
                  document.getElementById('proposition' + payload.id).click();
                }, 20);
              }

            } else if (payload.code === '3B'){

              // rejoinder

              for (var i = 0; i < $scope.data[0].nodes.length; i++){
                if ($scope.data[0].nodes[i].nodeId === payload.targetNodeId){
                  // console.log("Node index of i: ", i)
                  apply.nodeIndex = i;
                  for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                    if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.afterParagraphId){
                      apply.afterParagraphIndex = j;
                    }
                  }
                }
              }

              if ($scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1]){
                for (var i = $scope.data[0].nodes[apply.nodeIndex].paragraphs.length-1; i > (apply.afterParagraphIndex-1); i--){
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[i + 1] = angular.copy($scope.data[0].nodes[apply.nodeIndex].paragraphs[i]);
                }
                $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                  first: false,
                  paragraphId: payload.paragraphId,
                  propositions: [
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar
                    }
                  ]
                }
              } else {
                $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                  first: true,
                  paragraphId: payload.paragraphId,
                  propositions: [
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar
                    }
                  ]
                }
              }

              for (var i = 0; i < $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.afterParagraphTarget].propositions.length; i++){
                for (var j = 0; j < $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.afterParagraphTarget].propositions[i].remarks.length; j++){
                  if (payload.rejoins === $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.afterParagraphTarget].propositions[i].remarks[j].id){
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.afterParagraphTarget].propositions[i].remarks[j].rejoined = true;
                    break;
                  }
                }

              }
              if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                setTimeout(function () {
                //   $scope.$apply(function () {
                    document.getElementById('proposition' + payload.id).click();
                //   });
                }, 20);
              }

            } else if (payload.code === '3A'){
              // regular rejoinder

             for (var i = 0; i < $scope.data[0].nodes.length; i++){

               for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

                 for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                   if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.afterPropositionId &&
                    !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                     apply.nodeTarget = i;
                     apply.paragraphTarget = j;
                     apply.afterPropTarget = k;
                     break;
                   }
                 }
               }
             }

             if ($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1]){

               for (var n = angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length-1); n > apply.afterPropTarget; n--){
                 $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+1] =
                 angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n]);
               }
               $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1] = {
                 id: payload.id,
                 type: 'assertion',
                 author: payload.author,
                 text: payload.text,
                 remarks: [],
                 dialogueSide: false,
                 first: true,
                 messagesSoFar: payload.messagesSoFar,
                 isRejoinder: true
               }
             } else {
               $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1] = {
                 id: payload.id,
                 type: 'assertion',
                 author: payload.author,
                 text: payload.text,
                 remarks: [],
                 dialogueSide: false,
                 first: true,
                 messagesSoFar: payload.messagesSoFar,
                 isRejoinder: true
               }
             }


             // isn't finding the remark to rejoin somewhere in here

              for (var i = 0; i < $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length; i++){
                for (var j = 0; j < $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[i].remarks.length; j++){
                  if (payload.rejoins === $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[i].remarks[j].id){
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[i].remarks[j].rejoined = true;
                    break;
                  }
                }

              }

             if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
               setTimeout(function () {
                   document.getElementById('proposition' + payload.id).click();
               }, 20);
             }


            } else if (payload.code === '3F'){

              console.log("3f leftadd received")

              for (var i = 0; i < $scope.data[0].nodes.length; i++){

                for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                    if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.beforePropositionId &&
                      !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                      apply.nodeTarget = angular.copy(i);
                      apply.paragraphTarget = angular.copy(j);
                      apply.beforePropTarget = angular.copy(k);
                      break;
                    }
                  }
                }
              }

              $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.beforePropTarget].preSelected = false;

              if (!payload.draggedProps){
                  for (var n = angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length-1); n > apply.beforePropTarget-1; n--){
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+1] =
                    angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n]);
                  }

                  $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.beforePropTarget] = {
                    id: payload.id,
                    type: 'assertion',
                    author: payload.author,
                    text: payload.text,
                    remarks: [],
                    dialogueSide: false,
                    first: true,
                    messagesSoFar: payload.messagesSoFar,
                    preSelected: false
                  }
                if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                  setTimeout(function () {
                      document.getElementById('proposition' + payload.id).click();
                  }, 20);
                }
                console.log("Just placed left: ", $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.beforePropTarget])

              } else {
                  for (var n = angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length-1); n > apply.beforePropTarget-1; n--){
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+payload.draggedProps.length] =
                    angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n]);
                  }
                  for (var n = 0; n < payload.draggedProps.length; n++){
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.beforePropTarget] = angular.copy(payload.draggedProps[n]);
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.beforePropTarget].isPresentlyBeingDragged = false;
                    console.log("Just put in a ", $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.beforePropTarget].text)
                  }
              }


            } else if (payload.code === '3D'){

              console.log("3d topadd received")

              for (var i = 0; i < $scope.data[0].nodes.length; i++){
                for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                  if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.beforeParagraphId &&
                    !$scope.data[0].nodes[i].paragraphs[j].hiddenForAll){
                    apply.nodeTarget = angular.copy(i);
                    apply.beforeParagraphTarget = angular.copy(j);
                    break;
                  }
                }
              }

              for (var k = angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs.length-1); k > (apply.beforeParagraphTarget-1); k--){
                $scope.data[0].nodes[apply.nodeTarget].paragraphs[k+1] = angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[k]);
              }

              if (!payload.draggedProps){
                $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget] = {};

                $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget] = angular.copy({
                  first: true,
                  paragraphId: payload.paragraphId,
                  propositions: [
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar,
                      preSelected: false
                    }
                  ]
                })

                if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                  setTimeout(function () {
                      document.getElementById('proposition' + payload.id).click();
                  }, 20);
                }
              } else {
                $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget] = {};

                $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget] = angular.copy({
                  first: true,
                  paragraphId: payload.paragraphId,
                  propositions: [
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar,
                      preSelected: false
                    }
                  ]
                })
                for (var n = 0; n < payload.draggedProps.length; n++){
                  $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget].propositions[n] = payload.draggedProps[n];
                  $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget].propositions[n].isPresentlyBeingDragged = false;
                  console.log("Just put in a ", $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget].propositions[n].text)
                }
              }

            } else if (payload.code === '3E'){
              console.log("3e bottomadd received")
              for (var i = 0; i < $scope.data[0].nodes.length; i++){
                if ($scope.data[0].nodes[i].nodeId === payload.targetNodeId){
                  apply.nodeIndex = angular.copy(i);
                  for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                    if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.afterParagraphId &&
                      !$scope.data[0].nodes[i].paragraphs[j].hiddenForAll){

                      apply.afterParagraphIndex = angular.copy(j);
                      console.log("After paragraph index: ", angular.copy(apply.afterParagraphIndex));
                      break;
                    }
                  }
                }
              }
              if ($scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1]){
                if (!payload.draggedProps){
                  for (var i = $scope.data[0].nodes[apply.nodeIndex].paragraphs.length-1; i > (apply.afterParagraphIndex-1); i--){
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[i + 1] = angular.copy($scope.data[0].nodes[apply.nodeIndex].paragraphs[i]);
                  }
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                    first: false,
                    paragraphId: payload.paragraphId,
                    propositions: [
                      {
                        id: payload.id,
                        type: 'assertion',
                        author: payload.author,
                        text: payload.text,
                        remarks: [],
                        dialogueSide: false,
                        first: true,
                        messagesSoFar: payload.messagesSoFar,
                        preSelected: false
                      }
                    ]
                  }
                  if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                    setTimeout(function () {
                        document.getElementById('proposition' + payload.id).click();
                    }, 20);
                  }
                } else {
                  for (var i = $scope.data[0].nodes[apply.nodeIndex].paragraphs.length-1; i > (apply.afterParagraphIndex -1); i--){
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[i + 1] = angular.copy($scope.data[0].nodes[apply.nodeIndex].paragraphs[i]);
                  }
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                    first: false,
                    paragraphId: payload.paragraphId,
                    propositions: [

                    ]
                  }
                  for (var n = 0; n < payload.draggedProps.length; n++){
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1].propositions[n] = payload.draggedProps[n];
                  }
                }

              } else {
                if (!payload.draggedProps){
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                    first: true,
                    paragraphId: payload.paragraphId,
                    propositions: [
                      {
                        id: payload.id,
                        type: 'assertion',
                        author: payload.author,
                        text: payload.text,
                        remarks: [],
                        dialogueSide: false,
                        first: true,
                        messagesSoFar: payload.messagesSoFar,
                        preSelected: false
                      }
                    ]
                  }
                  if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                    setTimeout(function () {
                        document.getElementById('proposition' + payload.id).click();
                    }, 20);
                  }
                } else {
                  console.log("THE ELSEee")
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                    first: true,
                    paragraphId: payload.paragraphId,
                    propositions: [
                    ]
                  }
                  for (var n = 0; n < payload.draggedProps.length; n++){
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1].propositions[n] = payload.draggedProps[n];
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1].propositions[n].hiddenForAll = null;
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1].propositions[n].isPresentlyBeingDragged = false;
                    console.log($scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1].propositions[n].text, " was just placed");
                    console.log($scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1], " is the paragraph");
                    console.log($scope.data[0].nodes[apply.nodeIndex], " is the node");
                    // console.log("Just put in a ", $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.afterParagraphIndex + 1].propositions[n].text)
                  }
                }


              }


            } else if (payload.code === '3G'){
              console.log("It's a 3g pretty normal proposition")

              if (!payload.draggedProps){
                for (var i = 0; i < $scope.data[0].nodes.length; i++){

                  for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

                    for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                      if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.afterPropositionId &&
                        !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                        $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden'){
                        apply.nodeTarget = angular.copy(i);
                        apply.paragraphTarget = angular.copy(j);
                        apply.afterPropTarget = angular.copy(k);
                        console.log("I J K: ", apply.nodeTarget, " ", apply.paragraphTarget," ", apply.afterPropTarget)
                        break;
                      }
                    }
                  }
                }

                $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget].preSelected = false;

                if ($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1]){
                  for (var n = $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length-1; n > apply.afterPropTarget; n--){
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+1] =
                    angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n]);

                  }
                  $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1] = {
                    id: payload.id,
                    type: 'assertion',
                    author: payload.author,
                    text: payload.text,
                    remarks: [],
                    dialogueSide: false,
                    first: true,
                    messagesSoFar: payload.messagesSoFar,
                    preSelected: false
                  }
                } else {
                  $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1] = {
                    id: payload.id,
                    type: 'assertion',
                    author: payload.author,
                    text: payload.text,
                    remarks: [],
                    dialogueSide: false,
                    first: true,
                    messagesSoFar: payload.messagesSoFar,
                    preSelected: false
                  }
                }

                if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide &&
                  !payload.draggedProps){
                  setTimeout(function () {
                      console.log("Hayo")
                      document.getElementById('proposition' + payload.id).click();
                  }, 20);
                }
              } else {
                for (var i = 0; i < $scope.data[0].nodes.length; i++){

                  for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

                    for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                      if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.afterPropositionId &&
                        !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                        $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden'){
                        apply.nodeTarget = angular.copy(i);
                        apply.paragraphTarget = angular.copy(j);
                        apply.afterPropTarget = angular.copy(k);
                        console.log("I J K: ", apply.nodeTarget, " ", apply.paragraphTarget," ", apply.afterPropTarget)
                        break;
                      }
                    }
                  }
                }

                if ($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1]){

                    for (var n = $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length-1; n > apply.afterPropTarget; n--){

                      $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+payload.draggedProps.length] =
                      angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n]);
                      console.log("Just placed: ", angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n]));
                    }
                    for (var n = 0; n < payload.draggedProps.length; n++){

                      $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.afterPropTarget+1] = payload.draggedProps[n];
                      $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.afterPropTarget+1].isPresentlyBeingDragged = false;

                    }

                  if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide && !payload.draggedProps){
                    setTimeout(function () {

                      document.getElementById('proposition' + payload.id).click();
                    }, 20);
                  }
                } else {
                    for (var n = 0; n < payload.draggedProps.length; n++){
                      $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.afterPropTarget+1] = payload.draggedProps[n];
                      $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.afterPropTarget+1].isPresentlyBeingDragged = false;
                    }

                  if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide && !payload.draggedProps){
                    setTimeout(function () {
                      document.getElementById('proposition' + payload.id).click();
                    }, 20);
                  }
                }
              }



            } else if (payload.code === '4') {
              console.log("replaces blank")
              for (var i = 0; i < $scope.data[0].nodes.length; i++){
                if ($scope.data[0].nodes[i].nodeId === payload.targetNodeId){
                  console.log("FIRST IF")
                  apply.nodeIndex = i;
                  for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                    if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.afterParagraphId){
                      console.log("SECOND IF")
                      apply.afterParagraphIndex = j;
                      $scope.data[0].nodes[i].paragraphs[j].first = false;
                      $scope.data[0].nodes[i].paragraphs[j].hiddenForAll = true;
                      for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){

                        $scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll = true;
                        $scope.data[0].nodes[i].paragraphs[j].propositions[k].first = false;
                        if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks){
                          console.log("In if remarks")
                          for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                            $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].hiddenForAll = true;
                          }
                        }
                      }
                      break;
                    }
                  }
                }
              }



              if (!payload.draggedProps){
                console.log("If not dragged props")
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                  first: true,
                  paragraphId: payload.paragraphId,
                  propositions: [
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar,
                      preSelected: false
                    }
                  ]
                }

                setTimeout(function () {
                    document.getElementById('proposition' + payload.id).click();
                }, 20);
              } else {
                console.log("else dragged props")
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                  first: true,
                  paragraphId: payload.paragraphId,
                  propositions: []
                }
                for (var n = 0; n < payload.draggedProps.length; n++){
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex+1].propositions[n] = payload.draggedProps[n];
                }
              }
              
            }

            console.log("Outside receive sieve")

            $scope.scroll.threadId = IdFactory.next();

            if (payload.author === $scope.userId &&
              payload.textSide &&
              $scope.cowsComeHome == true){

              apply.muteIncomingThread = true;
            }


            //       DIALOGUE PRINTER

            payload.color = $scope.calcColors(angular.copy(payload));

            if (payload.type === 'assertion' && !payload.draggedProps){
              var goingToPushThis = {
                isMessage: true,
                author: payload.author,
                text: payload.text,
                dialogueText: payload.dialogueText,
                type: payload.type,
                of: payload.of,
                id: payload.id,
                previousMessages: payload.previousMessages,
                messagesSoFar: payload.messagesSoFar,
                color: payload.color
              }
              $scope.data[0].dialogue.push(
              {
                isMessage: true,
                author: payload.author,
                text: payload.text,
                dialogueText: payload.dialogueText,
                type: payload.type,
                of: payload.of,
                id: payload.id,
                previousMessages: payload.previousMessages,
                messagesSoFar: payload.messagesSoFar,
                color: payload.color
              })
            } else if (payload.type === 'negation'){
              if ($scope.data[0].dialogue[$scope.data[0].dialogue.length-1].of.id === payload.of.id &&
                $scope.data[0].dialogue[$scope.data[0].dialogue.length-1].type === 'negation'){
                $scope.data[0].dialogue.push(
                {
                  isMessage: true,
                  author: payload.author,
                  text: payload.text,
                  dialogueText: payload.dialogueText,
                  type: payload.type,
                  of: payload.of,
                  id: payload.id,
                  previousMessages: payload.previousMessages,
                  messagesSoFar: payload.messagesSoFar,
                  color: payload.color
                })
              } else {
                for (var i = 0; i < $scope.data[0].dialogue.length; i++){
                  if ($scope.data[0].dialogue[i].id === payload.of.id){
                    $scope.messageToCopy = angular.copy($scope.data[0].dialogue[i]);
                    $scope.data[0].dialogue.splice(i, 1);
                  }
                }

                $scope.data[0].dialogue.push($scope.messageToCopy);
                $scope.data[0].dialogue.push(
                {
                  isMessage: true,
                  author: payload.author,
                  text: payload.text,
                  dialogueText: payload.dialogueText,
                  type: payload.type,
                  of: payload.of,
                  id: payload.id,
                  previousMessages: payload.previousMessages,
                  messagesSoFar: payload.messagesSoFar,
                  color: payload.color
                })
                $scope.messageToCopy = {};
              }


            } else if (payload.isRejoinder && !payload.draggedProps){
              for (var i = 0; i < $scope.data[0].dialogue.length; i++){
                if ($scope.data[0].dialogue[i].id === payload.of.id){
                  $scope.messageToCopy = angular.copy($scope.data[0].dialogue[i]);
                  $scope.data[0].dialogue.splice(i, 1);
                }
              }
              $scope.data[0].dialogue.push($scope.messageToCopy);
              $scope.data[0].dialogue.push(
              {
                isMessage: true,
                author: payload.author,
                text: payload.text,
                dialogueText: payload.dialogueText,
                type: payload.type,
                of: payload.of,
                id: payload.id,
                previousMessages: payload.previousMessages,
                messagesSoFar: payload.messagesSoFar,
                color: payload.color
              })
            }
            $scope.messageToCopy = {};

            if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
              $scope.hasChatFocusId = '';
            }

            if (apply.muteIncomingThread) {
              $scope.data[0].dialogue[$scope.data[0].dialogue.length - 1][$scope.userId] = 'hidden';
            }

            // goes split screen on the first message
            if ($scope.isMessageFresh && !$scope.fullScreenMessages){
              console.log("Message defreshening")
              $scope.goSplitScreen();
              $scope.isMessageFresh = false;
            }

            for (var i = 0; i < $scope.userColorTable.length; i++) {
              if ($scope.userColorTable[i].author === payload.author &&
                payload.author !== $scope.userId) {
                var alreadyThere = true;
                var place = i;
                break;
              }
            }
            if (!alreadyThere && payload.type !== 'topic') {
              if (payload.author !== $scope.userId) {
                $scope.userColorTable.push(
                  {
                    author: payload.author,
                    color: $scope.generateNewColor()
                  }
                );
              }
            } else if (payload.author !== $scope.userId &&
              payload.type !== 'topic') {
              if (payload.type !== 'negation') {
                //
              }
            }

            temp = {};
            apply = {};
            $scope.scroll = {};

            if (payload.author === $scope.data[0].documentClaimedBy &&
              $scope.userId !== $scope.data[0].documentClaimedBy &&
              (payload.type === 'assertion' || payload.type === 'rejoinder') &&
              $scope.inputs.proposition != "" &&
              payload.ofParagraphId === $scope.selectedParagraph.paragraphId){
              $scope.inputs.proposition = '';
            }

            if ($scope.selectedProposition.dialogueSide && payload.author === $scope.userId){
              $scope.hasChatFocusId = payload.id;

              setTimeout(function () {
                  $scope.selectedProposition.dialogueSide = true;
                  $scope.didItRun(message.id);
                  $scope.clearTopAndBottomHasFocus();
                  $scope.hideExpandingTextarea();
                  $scope.selectPropositionById(payload.id);
                  $scope.selectedProposition.textSide = false;
                  console.log("Precedes a bad click eh?")
                  document.getElementById('input' + payload.id).click();
                  focusFactory('input' + payload.id);
              }, 20);
            }
            $scope.scrollMessagesToBottom();
            $scope.assignFirstsToNodes();
            if (payload.author === $scope.userId){
              $scope.makePristine();
            }
            apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
            apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
            profileService.setSelectedBook($scope.data[0]);

            if (payload.author !== $scope.userId && $scope.inputs.proposition){
              $scope.saveThisForASec = angular.copy($scope.inputs.proposition)
            }

          });
          if ($scope.saveThisForASec){
            $scope.inputs.proposition = $scope.saveThisForASec;
            $scope.inputs.leftProposition = $scope.saveThisForASec;
            $scope.saveThisForASec = '';
          }
          // console.log("Save for a sec: ", angular.copy($scope.saveThisForASec))
        }, 30);                                             // HAS A TIMEOUT


        if (payload.author === $scope.userId) {
          $scope.draggedProposition = {};
        }

        $scope.clearAnimationClass();
      });



      $scope.clearAnimationClass = function () {
        setTimeout(function () {
          $scope.$apply(function () {
            $scope.propToAddAnimate = {};
          });
        }, 20);
      }

      $scope.selectThread = function (thread) {
        $scope.selectedThread = thread;
        $scope.hasChatFocusThreadId = thread.threadId;
      };

      $scope.clearGoddamnTextarea = function () {
        $('#' + $scope.selectedRemark.id + $scope.selectedThread.threadId)
          .parent().hide();
      };

      $scope.clickBottom = function (paragraphId) {
        $timeout(function () {
          document.getElementById(paragraphId).click();
        }, 0);
      };

      $scope.clearTopAndBottomHasFocus = function () {

        $scope.hasTopFocus = '';
        $scope.hasBottomFocus = {};
        $scope.hasTopNodeFocus = {};
        $scope.hasBottomNodeFocus = '';
        $scope.hasChatFocusId = '';
        if ($scope.editing){
          $scope.clearEditing();
        }
        $scope.unHighlightNode();

      };

      $scope.clearThreadAdding = function () {
        $scope.threadAdding = '';
      };

      $scope.selectPropositionById = function (id) {
        console.log("Selecting by id")
        $scope.inputs.chatProposition = '';
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
            for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
              for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].id === id &&
                  !$scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].droppedElsewhere){
                  $scope.selectedNode = angular.copy($scope.data[0].nodes[i]);
                  $scope.selectedParagraph = angular.copy($scope.data[0].nodes[i].paragraphs[j]);

                  $scope.selectedProposition = $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m];
                  $scope.hasChatFocusId = id;
                  setTimeout(function () {
                     focusFactory('input'+ id)
                  }, 20);
                  break;
                }
              }
              if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === id &&
                !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden'){
                $scope.selectedNode = angular.copy($scope.data[0].nodes[i]);
                $scope.selectedParagraph = angular.copy($scope.data[0].nodes[i].paragraphs[j]);

                $scope.selectedProposition = $scope.data[0].nodes[i].paragraphs[j].propositions[k];
                $scope.hasChatFocusId = id;
                setTimeout(function () {
                  console.log("The element to show: ", document.getElementById('#input'+id))
                   focusFactory('input'+ id)
                   console.log("to be clicked el: ", document.getElementById('input' + id))
                }, 20);
                break;

              }
            }
          }
        }

        $scope.foundIt = undefined;

        function traverseArray(arr) {
          arr.forEach(function (x) {
            traverse(x);
          });
        }

        function traverseObject(obj) {
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              traverse(obj[key], key, obj);
            }
          }
        }

        function traverse(x, key, obj) {
          if (isArray(x) && !$scope.foundIt) {
            traverseArray(x);
          } else if ((typeof x === 'object') && (x !== null) && !$scope.foundIt) {
            traverseObject(x);
          } else if (!$scope.foundIt){
            if (key === 'paragraphId' && !obj.isDraggedParagraph) {
              for (var i = 0; i < obj.propositions.length; i++) {
                if (obj.propositions[i].id === id && obj.propositions[i][$scope.userId] !== 'hidden' &&
                  !obj.propositions[i].hiddenForAll){
                    $scope.selectedParagraph = angular.copy(obj);
                    $scope.selectedProposition = angular.copy(obj.propositions[i]);
                    $scope.selectedNode = eval(obj.propositions[i].nodePath);
                    $scope.foundIt = true;
                    break;
                }
              }

              setTimeout(function () {
                $scope.mark = {};
                $scope.highlight = {};
                if ($scope.selectedProposition) {
                  if ($scope.selectedProposition.id) {
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $scope.hasChatFocusId = $scope.selectedProposition.id;
                  } else {
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $scope.hasChatFocusId = $scope.selectedProposition.id;
                  }
                } else {
                  $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                        .expanding();
                  $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                        .expanding();
                  $scope.hasChatFocusId = $scope.selectedProposition.id;
                }
                $scope.selectedProposition.dialogueSide = true;
                var destination = document.getElementById('proposition' + $scope.selectedProposition.id);
                if (destination) {
                  destination.scrollIntoView({behavior: 'smooth'});
                }
                var query = '#' + $scope.selectedProposition.id + $scope.selectedThread.threadId;
                $scope.$apply(function () {
                  $(query).parent().show();
                  $(query).expanding();
                  $(query).focus();
                });
              }, 20);
              temp = {};
              if ($scope.foundIt){
                return;
              }

            }
          }
        }
      };

      $scope.saveForLater = function (remarkId, thread) {
        $scope.toSetLater = {
          remarkId: remarkId,
          threadId: thread.threadId
        };
      };

      $scope.clearDragDetector = function () {
        console.log("Clear drag RAN")
      }

      $scope.resetFromEnter = function () {
        console.log("Resetting from enter")
        $scope.inputs.proposition = '';
        $scope.inputs.leftProposition = '';
      }

      $scope.savePropositionForLater = function (id, position, paragraph) {

        $scope.propositionToSetLater = {
          id: id,
          position: position
        };
        $scope.paragraphToSetLater = paragraph;
      };

      $scope.clearSavePropositionForLater = function () {

        $scope.propositionToSetLater = {};
        $scope.paragraphToSetLater = {};
      }

      $scope.showTextArea = function () {
        $scope.selectThread($scope.toSetLater.thread);
        $scope.selectPropositionById($scope.toSetLater.remarkId);
      };

      $scope.confirmIfVisibleParagraph = function(paragraphId){
        if (document.getElementById('paragraph' + paragraphId)){
          return true;
        } else {
          return false;
        }
      }

      $scope.scrollMessagesToBottom = function () {
        console.log("Runs scroll fcn")
        $timeout(function () {
          var pane = document.getElementById('dialoguelist');
          pane.scrollTop = pane.scrollHeight + 300;
        }, 20);
      };

      $scope.blurLightUpLastVisiblePropositionInBook = function (book, event) {
        console.log("blur light up book")
        var apply = {};
        apply.path = '$scope.data[0]';
        apply.destination = eval(apply.path);
        apply.id = '';
        apply.flagged;

        for (var i = $scope.data[0].nodes.length-1; i > -1; i--){
          if (!$scope.data[0].nodes[i].minimized){
            for (var j = $scope.data[0].nodes[i].paragraphs.length-1; j > -1; j--){
              for (var k = $scope.data[0].nodes[i].paragraphs[j].propositions.length-1; k > -1; k--){
                if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length > 0){
                  for (var m = $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length-1; m > -1; m--){
                    if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m][$scope.userId] !== 'hidden' &&
                      !$scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].hiddenForAll){
                      $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].preSelected = false;
                      return;
                    }
                  }
                } else {
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].preSelected = false;
                  return;
                }
              }
            }
          }
        }

        apply = {};
      };

      $scope.diagnostics = function () {
        if ($scope.diagnostics){
          $scope.diagnostics = false;
        } else {
          $scope.diagnostics = true;
        }
       
      }

      $scope.lightUpLastVisiblePropositionInBook = function (book, event) {
        // console.log('light up book')
        // var apply = {};
        // apply.path = '$scope.data[0]';
        // apply.bookDestination = eval(apply.path);
        // apply.id = '';
        // apply.flagged;

        // //Find the rightmost child, if any

        // for (var i = $scope.data[0].nodes.length-1; i > -1; i--){
        //   if (!$scope.data[0].nodes[i].minimized){
        //     for (var j = $scope.data[0].nodes[i].paragraphs.length-1; j > -1; j--){
        //       for (var k = $scope.data[0].nodes[i].paragraphs[j].propositions.length-1; k > -1; k--){
        //         if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length > 0){
        //           for (var m = $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length-1; m > -1; m--){
        //             if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m][$scope.userId] !== 'hidden' &&
        //               !$scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].hiddenForAll){
        //               $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].preSelected = true;
        //               return;
        //             }
        //           }
        //         } else {
        //           $scope.data[0].nodes[i].paragraphs[j].propositions[k].preSelected = true;
        //           return;
        //         }
        //       }
        //     }
        //   }
        // }

        // apply = {};


        console.log('light up book')
         console.log("Event: ", event)

        if (event.target.localName === 'li' || event.target.classList[0] === 'bottomparagraphadder' || event.target.classList[0] !== 'angular-ui-tree'){
          console.log("not those lis or bottom adders")
          return;
        }
        // console.log("The target: ", event.target)
        // console.log("Length: ", angular.copy($scope.data[0].nodes.length))
        for (var i = $scope.data[0].nodes.length-1; i > -1; i--){
          console.log("I: ", angular.copy(i))
          if (!$scope.data[0].nodes[i].minimized){
            for (var j = $scope.data[0].nodes[i].paragraphs.length-1; j > -1; j--){
              console.log('j of: ', j)
              if (!$scope.data[0].nodes[i].paragraphs[j].hiddenForAll){
                console.log('through if on j with value for paragraph: ', j)
                for (var k = $scope.data[0].nodes[i].paragraphs[j].propositions.length-1; k > -1; k--){

                  if (!$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                    ($scope.data[0].documentClaimedBy === $scope.userId || $scope.data[0].nodes[i].paragraphs[j].propositions[k].type !== 'blank')){
                    console.log("first if")
                    if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[0] && !index){
                      console.log("second if")
                      var nodeIndex = angular.copy(i)
                      var paragraphIndex = angular.copy(j)
                      var index = angular.copy(k)
                      var remarkIndex = null;
                      for (var m = $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks.length-1; m > -1; m--){
                        if (!$scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks[m].hiddenForAll){
                          console.log("m of: ", angular.copy(m))
                          var remarkIndex = angular.copy(m);
                          // console.log("Hit. Remark index: ", remarkIndex)
                          break;
                        }
                      }
                      if (remarkIndex || remarkIndex == 0){
                        console.log("assigning if with remarkIndex ", remarkIndex)
                        setTimeout(function () {
                        // $scope.$apply(function () {
                         console.log("top timeout")
                         console.log("i: ", angular.copy(nodeIndex))
                         console.log("j: ", angular.copy(paragraphIndex))
                         console.log("k: ", angular.copy(index))
                          
                            $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks[remarkIndex].preSelected = true;
                        // });
                        
                        }, 20);
                      } else {
                        setTimeout(function () {
                        // $scope.$apply(function () {
                         console.log("this other timeout")
                          
                            $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].preSelected = true;
                        // });
                   
                        }, 20);
                      }
                      return;
                      // console.log('ran through')

                    } else if (!index) {
                      console.log("This else here")
                      var nodeIndex = angular.copy(i)
                      var paragraphIndex = angular.copy(j)
                      var index = angular.copy(k)
                      setTimeout(function () {
                        // $scope.$apply(function () {
                      
                            console.log("timeoutt")
                            $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].preSelected = true;
                        // });

                      }, 20);
                      return;
                      // console.log("break didnt work")
                    }
                  }
                }
              }
            }
          }
        }





      };


      $scope.getLastVisiblePropositionInBook = function (book, event) {

       
       $scope.unHighlightParagraph();
       console.log("The event in book: ", event)
       if (event.target.classList[0] == 'sectiontitle'){
        console.log("Returning sectio newSectionTitle")
       }

        console.log('get book')
        $scope.whatHasBeenClicked = '';
        // console.log("Length: ", angular.copy($scope.data[0].nodes.length))
        for (var i = $scope.data[0].nodes.length-1; i > -1; i--){
          if (!$scope.data[0].nodes[i].minimized){
            for (var j = $scope.data[0].nodes[i].paragraphs.length-1; j > -1; j--){
              console.log('j of: ', j)
              if (!$scope.data[0].nodes[i].paragraphs[j].hiddenForAll){
                console.log('through if on j with value for paragraph: ', j)
                for (var k = $scope.data[0].nodes[i].paragraphs[j].propositions.length-1; k > -1; k--){
                  if (!$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                    if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[0] && !index){
                      var nodeIndex = angular.copy(i)
                      var paragraphIndex = angular.copy(j)
                      var index = angular.copy(k)
                      var remarkIndex = null;
                      for (var m = $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks.length-1; m > -1; m--){
                        if (!$scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks[m].hiddenForAll){

                          var remarkIndex = angular.copy(m);
                          // console.log("Hit. Remark index: ", remarkIndex)
                          break;
                        }
                      }
                      if (remarkIndex || remarkIndex == 0){
                        setTimeout(function () {
                        // $scope.$apply(function () {
                         console.log("top timeout")
                         console.log("i: ", angular.copy(nodeIndex))
                         console.log("j: ", angular.copy(paragraphIndex))
                         console.log("k: ", angular.copy(index))
                          document.getElementById('proposition' +
                            $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks[remarkIndex].id).click();
                        // });
                        
                        }, 20);
                      } else {
                        setTimeout(function () {
                        // $scope.$apply(function () {
                         console.log("this other timeout")
                          document.getElementById('proposition' +
                            $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].id).click();
                        // });
                   
                        }, 20);
                      }
                      return;
                      // console.log('ran through')

                    } else if (!index) {
                      var nodeIndex = angular.copy(i)
                      var paragraphIndex = angular.copy(j)
                      var index = angular.copy(k)
                      $scope.selectedParagraph = $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex];
                      setTimeout(function () {
                        // $scope.$apply(function () {
                      
                          document.getElementById('proposition' +
                            $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].id).click();
                        // });

                      }, 20);
                      return;
                      // console.log("break didnt work")
                    }
                  }
                }
              }
            }
          }
        }

      };

      $scope.blurLightUpLastVisiblePropositionInNode = function (node, event) {
        console.log("blur node")
        for (var i = node.paragraphs.length - 1; i > -1; i--) {
          if (node.paragraphs[i][$scope.userId] !== 'hidden' && !node.paragraphs[i].hiddenForAll) {
            for (var j = node.paragraphs[i].propositions.length - 1; j > -1; j--) {
              if (node.paragraphs[i].propositions[j][$scope.userId] !== 'hidden' && node.paragraphs[i].propositions[j].hiddenForAll !== true &&
                node.paragraphs[i].propositions[j].preSelected === true) {
                node.paragraphs[i].propositions[j].preSelected = false;
                return;
              }
            }
          }
        }
      };

      $scope.lightUpLastVisiblePropositionInNode = function (node, event) {
        console.log('light up node')
        if (event.target.localName !== 'ol') {
          return;
        }
        for (var i = node.paragraphs.length - 1; i > -1; i--) {
          if (node.paragraphs[i][$scope.userId] !== 'hidden' && !node.paragraphs[i].hiddenForAll) {
            for (var j = node.paragraphs[i].propositions.length - 1; j > -1; j--) {
              if (node.paragraphs[i].propositions[j][$scope.userId] !== 'hidden' && node.paragraphs[i].propositions[j].hiddenForAll !== true) {
                node.paragraphs[i].propositions[j].preSelected = true;
                return;
              }
            }
          }
        }
      };

      $scope.getLastVisiblePropositionInNode = function (node, event, element) {
        $scope.unHighlightParagraph();
        console.log("get node")
        if (event.target.localName !== 'ol') {
          console.log("Returning node for having clicked other")
          return;
        }
        $scope.selectedNode = node;
        var itsFoundIt = false;
        for (var i = node.paragraphs.length - 1; i > -1; i--) {
          if (node.paragraphs[i][$scope.userId] !== 'hidden' &&
            node.paragraphs[i].hiddenForAll !== true) {
            console.log("hits on ", angular.copy(i))
            $scope.selectedParagraph = node.paragraphs[i];
            for (var j = node.paragraphs[i].propositions.length - 1; j > -1; j--) {
              if (node.paragraphs[i].propositions[j][$scope.userId] !== 'hidden' &&
                !node.paragraphs[i].propositions[j].hiddenForAll
                && !itsFoundIt) {
                $scope.selectedProposition = node.paragraphs[i].propositions[j];
                console.log("selects j ", angular.copy(j), " on i of ", angular.copy(i))
                itsFoundIt = true;
                break;
              }
            }
          }
        }
        itsFoundIt = false;
        var id = $scope.selectedProposition.id;
        $timeout(function () {
          focusFactory(id);
        }, 10);
      };

      $scope.blurLightUpLastVisiblePropositionInParagraph = function (node, paragraph, event) {
        console.log("blur paragraph")
        // for (var i = paragraph.propositions.length - 1; i > -1; i--) {
        //   if (paragraph.propositions[i][$scope.userId] !== 'hidden' && paragraph.propositions[i].hiddenForAll !== true &&
        //     paragraph.propositions[i].preSelected === true) {
        //     paragraph.propositions[i].preSelected = false;
        //     break;
        //   }
        // }


        // for (var i = node.paragraphs.length - 1; i > -1; i--){
          for (var j = paragraph.propositions.length - 1; j > -1; j--) {
            if (paragraph.propositions[j].remarks){
              for (var k = paragraph.propositions[j].remarks.length-1; k > -1; k--){
                if (!paragraph.propositions[j].remarks[k].hiddenForAll &&
                  paragraph.propositions[j].remarks[k][$scope.userId] !== 'hidden'){
                  paragraph.propositions[j].remarks[k].preSelected = false;
                  return;
                }
              }
            }
            if (paragraph.propositions[j][$scope.userId] !== 'hidden' && paragraph.propositions[j].hiddenForAll !== true) {
              paragraph.propositions[j].preSelected = false;
              return;
            }
          }
        // }


      };

      $scope.lightUpLastVisiblePropositionInParagraph = function (node, paragraph, event) {
        console.log("light up paragraph")
        if (event.target.localName !== 'ol') {
          return;
        }
        // console.log(event.target)
       
          for (var j = paragraph.propositions.length - 1; j > -1; j--) {
            if (paragraph.propositions[j].remarks){
              for (var k = paragraph.propositions[j].remarks.length - 1; k > -1; k--) {
                if (paragraph.propositions[j].remarks[k][$scope.userId] !== 'hidden' && paragraph.propositions[j].remarks[k].hiddenForAll !== true){
                  paragraph.propositions[j].remarks[k].preSelected = true;
                  return;
                }        
              }
            }
            if (paragraph.propositions[j][$scope.userId] !== 'hidden' && paragraph.propositions[j].hiddenForAll !== true &&
              ($scope.data[0].documentClaimedBy === $scope.userId || paragraph.propositions[j].type !== 'blank')) {
              paragraph.propositions[j].preSelected = true;
              return;
            }
          }
        
        
      };

      $scope.getLastVisiblePropositionInParagraph = function (node, paragraph, event) {
        $scope.unHighlightParagraph();  
        $scope.unHighlightNode();  
        if ($scope.draggingProposition || paragraph.leftAdd){
          console.log("Returning last in paragraph")
          return;
        }
        console.log("get paragraph")

        //regular clicks on lefts failing to get left


        $scope.selectedNode = node;
        $scope.selectedParagraph = paragraph;
        for (var i = paragraph.propositions.length - 1; i > -1; i--) {
          if (paragraph.propositions[i][$scope.userId] !== 'hidden' &&
            paragraph.propositions[i].hiddenForAll !== true) {
            console.log("If one")
            if (paragraph.propositions[i].remarks[0] && !index){
              console.log("If two")
              // var nodeIndex = angular.copy(i)
              // var paragraphIndex = angular.copy(j)
              var index = angular.copy(i)
              setTimeout(function () {
                 console.log("i: ", angular.copy(i))
                  document.getElementById('proposition' +
                    paragraph.propositions[index].remarks[paragraph.propositions[index].remarks.length-1].id).click();
                // });

              }, 20);
              return;
              // console.log('ran through')

            } else if (!index) {
              // var nodeIndex = angular.copy(i)
              // var paragraphIndex = angular.copy(j)
              var index = angular.copy(i)
              setTimeout(function () {
                  document.getElementById('proposition' +
                    paragraph.propositions[i].id).click();
                // });

              }, 20);
              return;
              // console.log("break didnt work")
            }



          }
        }
        // var id = $scope.selectedProposition.id;

      };

      $scope.hideExpandingTextarea = function () {

        // if ($scope.hasChatFocusId) {


      };

      $scope.clearExpandingClass = function (remark) {
        if (!remark.assertionPath || !$scope.selectProposition) {

          return;
        }

        if (!$scope.toBeClearedLater.remarkId) {
          $scope.toBeClearedLater.remarkId = remark.id;
          $scope.toBeClearedLater.threadId = $scope.selectedThread.threadId;
        }

        $('#' + $scope.toBeClearedLater.remarkId + $scope.toBeClearedLater.threadId)
          .parent().hide();
        $scope.toBeClearedLater = {};
      };

      $scope.clearLater = function (remarkId, threadId) {
        if (remarkId !== $scope.selectedProposition.id &&
          threadId !== $scope.selectedThread.threadId) {
          $scope.toBeClearedLater = {
            remarkId: $scope.selectedProposition.id,
            threadId: $scope.selectedThread.threadId
          };
        } else {
          $scope.toBeClearedLater.remarkId = remarkId;
          $scope.toBeClearedLater.threadId = threadId;
        }

      };

      $scope.selectNodeByThread = function (thread) {

        for (var m = thread.remarks.length; m > -1; m--){
          if (thread.remarks[m].author === $scope.data[0].documentClaimedBy){
            var theTarget = thread.remarks[m].id
          }
        }

        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
            for (var k = $scope.data[0].nodes[i].paragraphs[j].propositions.length; k > -1; k--){
              if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === theTarget &&
               $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden' &&
               !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                $scope.selectedNode = $scope.data[0].nodes[i];
              }
            }
          }
        }

        if ($scope.selectedProposition) {
          $scope.selectedProposition.dialogueSide = true;
        }
        temp = {};
      };

// ************** Generate the tree diagram  *****************

      $scope.initialize = function () {

        var margin = {top: 20, right: 120, bottom: 20, left: 120},
          width = 1200 - margin.right - margin.left,
          height = 550 - margin.top - margin.bottom;

        var i = 0,
          duration = 750;

        /*
         * [CE] d3.layout.tree() is now d3.tree() (d3 v4+)
         *
         * Removed:
         * var tree = d3.layout.tree()
         */
        var tree = d3.tree()
          .size([height, width]);

        /*
         * [CE] d3.svg.diagonal permanently removed (d3 v4+)
         * This is Mike Bostok's recommended replacement.
         *
         * Removed:
         * var diagonal = d3.svg.diagonal()
         *   .projection(function(d) { return [d.y, d.x]; });
        */
        function diagonal(d) {
          return 'M' + d.source.y + ',' + d.source.x +
            'C' + (d.source.y + d.target.y) / 2 + ',' + d.source.x +
            ' ' + (d.source.y + d.target.y) / 2 + ',' + d.target.x +
            ' ' + d.target.y + ',' + d.target.x;
        }

        d3.select('svg').remove();

        var svg = d3.select('.modal-body').append('svg')
          .attr('width', width + margin.right + margin.left)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var root = {};
        angular.copy($scope.data[0], root);
        root.x0 = 0;
        root.y0 = 0;

        // Compute the new tree layout.
        /*
         * [CE]
         * 1. tree.nodes(...) replaced with tree(...) (d3 v4+)
         * 2. root children must be set to null as tree is empty.
         * 3. root must be passed through d3.hierarchy() before tree()
         *
         * Removed:
         * var nodes = tree.nodes(root).reverse(),
         */
        root.children = null;
        root = d3.hierarchy(root);
        var nodes = tree(root),
          links = root.links();


        // Normalize for fixed-depth.
        nodes.each(function (d) {
          d.y = d.depth * 90;
        });

        // Update the nodes…
        var node = svg.selectAll('g.node')
          .data(nodes, function (d) {
            return d.id || (d.id = ++i);
          });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append('g')
          .attr('class', 'node')
          .attr('transform', function (/*d*/) {
            return 'translate(' + root.y0 + ',' + root.x0 + ')';
          });

        nodeEnter.append('circle')
          .attr('r', 1e-6)
          .style('fill', function (d) {
            return d._children ? 'rgb(30,135,193)' : 'rgb(30,135,193)';
          });

        nodeEnter.append('foreignObject')
          .attr('x', -18)
          .attr('y', 30)
          .attr('width', 30)
          .text(function (d) {
            return d.topic;
          });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
          .duration(duration)
          .attr('transform', function (d) {
            return 'translate(' + d.y + ',' + d.x + ')';
          });

        nodeUpdate.select('circle')
          .attr('r', 22)
          .style('fill', function (d) {
            return d._children ? 'lightsteelblue' : '#fff';
          });

        nodeUpdate.select('text')
          .style('color', 'rgb(255,255,255) !important');

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
          .duration(duration)
          .attr('transform', function (/*d*/) {
            return 'translate(' + root.y + ',' + root.x + ')';
          })
          .remove();
        nodeExit.select('circle')
          .attr('r', 22);

        nodeExit.select('text')
          .style('color', 'white');

        // Update the links…
        var link = svg.selectAll('path.link')
          .data(links, function (d) {
            return d.target.id;
          });

        // Enter any new links at the parent's previous position.
        link.enter().insert('path', 'g')
          .attr('class', 'link')
          .attr('d', function (/*d*/) {
            var o = {x: root.x0, y: root.y0};
            return diagonal({source: o, target: o});
          });
        // Transition links to their new position.
        link.transition()
          .duration(duration)
          .attr('d', diagonal);
        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
          .duration(duration)
          .attr('d', function (/*d*/) {
            var o = {x: root.x, y: root.y};
            return diagonal({root: o, target: o});
          })
          .remove();
        // Stash the old positions for transition.
        nodes.each(function (d) {
          d.x0 = d.x;
          d.y0 = d.y;
        });

      };



      var updateDialogue = function (payload, callback) {
        if ($scope.draggedProposition) {
          $scope.draggedProposition.comparator = payload.id;
        } else {
          $scope.draggedProposition.comparator = '';
        }
        if ((payload.blankParagraphForDeleter || payload.hideBlankParagraph) || $scope.draggedProposition.comparator ===
          payload.id) {

          // $scope.data[0].dialogue[$scope.data[0].dialogue.length - 1].remarks[0].text = '- Paragraph deleted -';
        } else {
          $scope.data[0].dialogue.push({
            class: payload.class,
            topic: payload.topic,
            address: payload.address,
            nodePath: (payload.nodePath ? payload.nodePath : undefined),
            oldNodePath: (payload.oldNodePath ? payload.oldNodePath : undefined),
            paragraphPosition: payload.paragraphPosition,
            question: (payload.question ? payload.question : undefined),
            threadId: $scope.scroll.threadId,
            remarks: [payload]
          });
          $scope.data[0].dialogue[$scope.data[0].dialogue.length - 1].remarks[0].deleted = true;
        }
        // Need to write for deletions of paragraphs
        // This disables interactivity for deleted remarks
        for (var i = 0; i < $scope.data[0].dialogue.length - 1; i++) {
          for (var j = 0; j < $scope.data[0].dialogue[i].remarks.length; j++) {
            if ($scope.data[0].dialogue[i].remarks[j].id === payload.id) {
              $scope.data[0].dialogue[i].remarks[j].hidden = true;
            } else if ($scope.data[0].dialogue[i].remarks[j].of) {
              if ($scope.data[0].dialogue[i].remarks[j].of.id === payload.id &&
                $scope.data[0].dialogue[i].remarks[j].type === 'negation') {
                $scope.data[0].dialogue[i].remarks[j].hidden = true;
              }
            }
          }
        }
        callback();
      };
      chatSocket.emit('room', $scope.bookId);
      $timeout(function() {
        if (!$scope.isGuest() && !$scope.loggedIn()) {
          console.log('you\'re here but you\'re not logged in... curious...');
          apiService.signInAnonymously().then(function () {
            $state.go('main.editor', $stateParams);
          });
        }
      }, 10);
    }; // end mainLoop

    $scope.onMenuClicked = function (key) {
      switch (key) {
        case 'profile':
          return $scope.openProfileModal();
        case 'settings':
          return $scope.openOptionsModal();
        case 'invert':
          return $scope.invert();
        case 'library':
          return $scope.openLibraryModal();
        case 'book':
          return $scope.openAddExistingBookModal();
        case 'copy':
          return $scope.copyBookIdToClipboard();
        case 'new':
          return $scope.openNewBookModal();
        case 'nav':
          return $scope.openNav();
        case 'only-me':
          if ($scope.loggedIn() || $rootScope.guest) {
            if (!$scope.othersAreHidden) {
              return $scope.hideOthersParagraphs();
            }
            return $scope.showOthersParagraphs();
          }
          return;
        case 'full-text':
          if ($scope.loggedIn() || $rootScope.guest) {
            if (!$scope.fullScreenText && $scope.data[0]) {
              return $scope.goFullScreenText();
            }
            return $scope.goSplitScreen();
          }
          return;
        case 'lossless':
          if ($scope.loggedIn() || $rootScope.guest) {
            if (!$scope.recycleRemarks) {
              return $scope.goRecycleRemarks();
            }
            return $scope.dontRecycleRemarks();
          }
          return;
        case 'export':
          // TODO
          return;
        case 'logout':
          return $scope.logout();
        default:
          return;
      }
    };

    $scope.menuButtons = [
      // {
      //   key: 'profile',
      //   icon: 'fa fa-user',
      //   tooltip: 'Profile',
      //   hoverColor: ColorFactory.random(),
      //   bgColor: '#ffffff'
      // },
      // {
      //   key: 'users',
      //   icon: 'fa fa-users',
      //   tooltip: 'Connected Users',
      //   hoverColor: ColorFactory.random(),
      //   bgColor: '#ffffff'
      // },
      // {
      //   key: 'settings',
      //   icon: 'fa fa-cog',
      //   tooltip: 'Settings',
      //   hoverColor: ColorFactory.random(),
      //   bgColor: '#ffffff',
      // },
      // {
      //   key: 'invert',
      //   icon: 'fas fa-sun',
      //   tooltip: 'Invert Colors',
      //   hoverColor: ColorFactory.random(),
      //   bgColor: '#ffffff',
      // },
      {
        key: 'only-me',
        icon: 'fa fa-user',
        tooltip: 'Toggle only me.',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'full-text',
        icon: 'fa fa-columns',
        tooltip: 'Toggle fullscreen / splitscreen',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'lossless',
        icon: 'fa fa-certificate',
        tooltip: 'Toggle remark recycling',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'library',
        icon: 'fa fa-bookmark',
        tooltip: 'Open your library',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'book',
        icon: 'fa fa-book',
        tooltip: 'Add an existing book',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'copy',
        icon: 'fa fa-share-square',
        tooltip: 'Copy book id to clipboard',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'new',
        icon: 'fa fa-plus',
        tooltip: 'Create a new book',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      // {
      //   key: 'nav',
      //   icon: 'fa fa-asterisk',
      //   tooltip: 'Open nav',
      //   hoverColor: ColorFactory.random(),
      //   bgColor: '#ffffff',
      // },
      {
        key: 'export',
        icon: 'fa fa-file-export',
        tooltip: 'Export',
        hoverColor: '#00c3d5',
        bgColor: '#ffffff'
      },
      {
        key: 'logout',
        icon: 'fa fa-sign-out-alt',
        tooltip: 'Logout',
        hoverColor: '#ff3c3c',
        bgColor: '#ffffff',
        onClick: $scope.logout
      },
    ];
    if ($rootScope.guest && !$scope.bookId) {
      $scope.openNewBookModal();
    }
  }

  angular.module('statements')
    .controller('EditorController', EditorController);

})();
