/*
 Chaining JS 
 Copyright (c) 2013 National Research Corporation

 Depends:
    jquery-2.0.3.js
    jquery-ui-1.10.3.js
    arboreal.js
    jquery.multiselect.js
    jquery.multiselect.filter.js
 
 Created:
    bwelch - 2013.08.27

 Modified:
    bwelch - 2013.08.28
    bwelch - 2013.08.30
    
*/


function chaining(selects, options, data, buildTree) {
    ///<summary>This class is used to initialize chaining. </summary>
    ///<param name="selects" type="array">A sorted array containing ids of each select element in the chain</param>
    ///<param name="options" type="object">The multiselect options object that is used for each select element</param>
    ///<param name="data" type="object">The data used to build the tree.  This is passed as an input parameter to the buildTree callback</param>
    ///<param name="buildTree" type="callback">Callback used to construct an arboreal tree.  Takes 'data' as input, and returns an arboreal tree where each node contains the following data points: value (the option value), label (the option text), extendedLabel (long text i.e.: "grandparent / parent / me"), checked (set to false).</param>
    ///<returns type="object">An instance of the 'chaining' class</returns>

    // private members
    var _tree;
    var _selects = selects;
    var _options = options;
    var _data = data;
    var _buildTree = buildTree;



    /*  PUBLIC METHODS
    -------------------------------------------*/

    function initialize() {
        ///<summary>
        /// 1) Create and add select options
        /// 2) Make top level options visible
        /// 3) Initialize multiselect on all select elements.</summary>

        _tree = _buildTree(_data);
        createOptions(_tree);
        addOptions(_tree);

        for (var i = 0; i < _selects.length; i++) {
            jQuery('#' + _selects[i])
                .multiselect(_options)
                .multiselectfilter()
                .multiselect(i != 0 ? 'disable' : 'enable')
                .bind('multiselectclick', click)
                .bind('multiselectcheckall', checkall)
                .bind('multiselectuncheckall', uncheckall)
                .bind('multiselectoptgrouptoggle', optgrouptoggle);
        }
    }

    function isChained(selectId) {
        ///<summary>See if a select element is chained.</summary>
        ///<returns type="boolean">True if the select element is chained, false otherwise.</returns>
        return jQuery.inArray(selectId, _selects);
    }

    function check(optionId) {
        ///<summary>Checks a checkbox, but does not refresh the multiselect widget.  
        ///   User this when checking multiple options at once and you want to 
        ///   defer calling refresh until all are checked.</summary>
        ///<returns type="boolean">True if the select element is chained, false otherwise.</returns>

        var clickedNode = lookUpNode(htmlIdToNodeId(optionId));
        clickedNode.data.checked = true;

        jQuery('#' + optionId)
            .attr('selected', true)
            .removeClass('ui-helper-hidden');

        addOptgroup(clickedNode);
    }

    
    function refresh(selectSelector) {
        ///<summary>perform the following actions on an select element
        /// 1) hide empty opt groups
        /// 2) enable scrolling if more than 14 rows (count optgroups and options) exist in the select
        /// 3) disable if 0 rows exist in the select
        /// 4) call refresh method in multiselect plugin</summary>

        var obj = jQuery('#' + selectSelector);
        obj.find('optgroup:not(:has(:not(.ui-helper-hidden)))').addClass('ui-helper-hidden');
        var descendants = obj.find(':not(.ui-helper-hidden)').length;

        obj.multiselect(descendants > 14 ? { 'height': 400 } : { 'height': 'auto' })
           .multiselect(descendants > 0 ? 'enable' : 'disable')
           .multiselect('refresh');
    }


    /*  PRIVATE METHODS - DOM MANIPULATION
    -------------------------------------------*/

    // create all options
    function createOptions(node) {
        node.traverseDown(function iterator(descendant) {
            if (node.id == descendant.id) {
                addOptions(descendant, true)
            } else {
                descendant.data.checked = false;
                addOptgroup(descendant, true);
            }
        });
    }
    
    // add (or show) an optgroup for this node in the select element one level below it
    function addOptgroup(checkedNode, create) {

        var nodesAdded = 0;

        if (checkedNode.depth < _selects.length && checkedNode.children.length > 0) {
            if (create) {
                jQuery('#' + _selects[checkedNode.depth])
                    .append('<optgroup class="ui-helper-hidden" label="' + checkedNode.data.extendedLabel + '"></optgroup>');
            } else {
                jQuery('#' + _selects[checkedNode.depth] + ' optgroup[label="' + checkedNode.data.extendedLabel + '"]')
                    .removeClass('ui-helper-hidden');
            }
            nodesAdded = addOptions(checkedNode, create);
        }

        return nodesAdded;

    }
    
    // add (or show) option elements to an otpgroup 
    function addOptions(node, create) {

        var optionsAdded; 
        var selectSelector = _selects[node.depth];
        var optgroupSelector = node.parent ? ' optgroup[label="' + node.data.extendedLabel + '"]' : '';

        for (optionsAdded = 0; optionsAdded < node.children.length; optionsAdded++) {
            var child = node.children[optionsAdded];
            if (create) {
                jQuery('#' + selectSelector + optgroupSelector)
                    .append('<option class="ui-helper-hidden" id=' + nodeIdToHtmlId(child.id) + ' value=' + child.data.value + '>' + child.data.label + '</option>');
            } else {
                jQuery('#' + nodeIdToHtmlId(child.id)).removeClass('ui-helper-hidden');
            }
        }

        return optionsAdded;
    }

    // hide all option elements that are descendants of this node
    function hideOptions(node) {
        node.traverseDown(function iterator(descendant) {
            if (node.id != descendant.id) {
                descendant.data.checked = false;
                jQuery('#' + nodeIdToHtmlId(descendant.id))
                    .attr('selected', false)
                    .removeAttr('aria-selected')
                    .addClass('ui-helper-hidden');
            }
        });
    }
            
    



    /*  PRIVATE METHODS - EVENT HANDLERS
    -------------------------------------------*/
    
    // handle click event
    function click(event, ui) {

        var selectId = event.target.id;
        var opt = jQuery('#' + selectId + ' option[value ="' + ui.value + '"]');
        var clickedNode = lookUpNode(htmlIdToNodeId(opt[0].id));

        if (ui.checked) {
            clickedNode.data.checked = true;
            if (addOptgroup(clickedNode) > 0) {
                refresh(_selects[clickedNode.depth]);
            }
        }
        else {
            clickedNode.data.checked = false;
            hideOptions(clickedNode);
            for (var i = clickedNode.depth; i < _selects.length; i++) {
                refresh(_selects[i]);
            }

        }
    }

    // handle checkall event
    function checkall(event) {

        var nodesAdded = 0, depth;
        var selectId = event.target.id;

        jQuery('#' + selectId + ' option[aria-selected="true"]')
            .each(function () {
                var node = lookUpNode(htmlIdToNodeId(this.id));
                if (!node.data.checked) {
                    nodesAdded += addOptgroup(node);
                    node.data.checked = true;
                }
                depth = node.depth;
            });
        
        if (nodesAdded > 0) {
            refresh(_selects[depth]);
        }

    }

    // handle uncheckall event
    function uncheckall(event) {

        var depth;
        var selectId = event.target.id;

        jQuery('#' + selectId + ' option:not([aria-selected="true"])')
            .each(function () {
                var node = lookUpNode(htmlIdToNodeId(this.id));
                if (node.data.checked) {
                    hideOptions(node);
                    node.data.checked = false;
                }
                depth = node.depth;
            });

        for (var i = depth; i < _selects.length; i++) {
            refresh(_selects[i]);
        }
    }

    // handle optgrouptoggle (optgroup click) event
    function optgrouptoggle(event, ui) {

        var nodesAdded = 0, depth;

        if (ui.checked) {
            for (var i = 0; i < ui.inputs.length; i++) {
                var node = lookUpNode(htmlIdToNodeId(ui.inputs[i].id));
                if (!node.data.checked) {
                    nodesAdded += addOptgroup(node);
                    node.data.checked = true;
                }
                depth = node.depth;
            }

            if (nodesAdded > 0) {
                refresh(_selects[depth]);
            }
        }
        else {
            for (var i = 0; i < ui.inputs.length; i++) {
                var node = lookUpNode(htmlIdToNodeId(ui.inputs[i].id));
                if (node.data.checked) {
                    hideOptions(node);
                    node.data.checked = false;
                }
                depth = node.depth;
            }

            for (var i = depth; i < _selects.length; i++) {
                refresh(_selects[i]);
            }
        }
    }



    /*  PRIVATE METHODS - HELPERS
    -------------------------------------------*/

    // fast lookup for a tree node by it's id
    function lookUpNode(nodeId) {

        var ids = nodeId.split('/');
        var node = _tree.children[ids[1]];
        for (i = 2; i < ids.length; i++)
            node = node.children[ids[i]];

        return node;
    }

    // convert a tree-node ID to an html compatible id
    function nodeIdToHtmlId(nodeId) {
        return 't-' + nodeId.replace(/\//g, '-');
    }

    // convert an html id back to a tree-node id
    function htmlIdToNodeId(htmlId) {
        return htmlId
            .replace(/ui-multiselect-/, '')
            .replace(/t-/, '')
            .replace(/-/g, '/');
    }



    /*  ENCAPSULATION
    -------------------------------------------*/
    
    var self = this;
    self.initialize = initialize;
    self.isChained = isChained;
    self.check = check;
    
}
