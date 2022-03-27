(function() {
  'use strict';

  /** @ngInject */
  function BookFactory(IdFactory) {

    // TODO This needs to be defined as a typed object with enums and such
    var empty = function(title) {
      return {
        nodes: [
            {
                topic: title,
                isTitle: true,
                dateCreated: Date(),
                lastModified: null,
                nodeId: IdFactory.next(),
                minimized: false,
                sectionNumber: 0,
                sectionLevel: 0,
                paragraphs: [
                    {
                        first: true,
                        paragraphId: IdFactory.next(),
                        theBlankParagraph: true,
                        propositions: [
                            {
                                id: IdFactory.next(),
                                type: 'blank',
                                author: '',
                                text: '',
                                remarks: [{}],
                                dialogueSide: false,
                                first: true,
                                remarksExpanded: true
                            }
                        ]
                    }
                ],
            }
        ],
        dialogue: [
                    // {
                    //   class:"Info",
                    //   topic:"Info",
                    //   address:[],
                    //   nodePath:"$scope.data[0]",
                    //   threadId: IdFactory.next(),
                    //   remarks:[
                    //             {
                    //               id:IdFactory.next(),
                    //               address:[],
                    //               nodePath:"$scope.data[0]",
                    //               author:"info",
                    //               text:"Info",
                    //               dialogueText:"Info and all this info. It's so full of info you barely notice.",
                    //               type:"info"
                    //             }
                    //           ]
                    // },
                    // {
                    //   class:"Info",
                    //   topic:"Info",
                    //   address:[],
                    //   nodePath:"$scope.data[0]",
                    //   threadId: IdFactory.next(),
                    //   remarks:[
                    //             {
                    //               id:IdFactory.next(),
                    //               address:[],
                    //               nodePath:"$scope.data[0]",
                    //               author:"info",
                    //               text:"Info",
                    //               dialogueText:"And here is this more info that is even more info than you need for information.",
                    //               type:"info"
                    //             }
                    //           ]
                    // }
        ]


      };
    };

    return {
      empty: empty
    };

  }

  angular.module('statements')
    .factory('BookFactory', BookFactory);
})();
