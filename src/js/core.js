define(['utils', 'filters', 'knockout', 'knockout.mapping', 'jquery'], function(utils, filters, ko, komap, $){
	function koWidgetBindingInit(){ // <!-- ko widget: { data: btn1, type: "Button", title: "button #1" } --><!-- /ko -->
		function init(elem, valueAccessor, allBindingsAccessor, viewModel, bindingContext){
	    	var val = valueAccessor();
	    	var widget = ko.utils.unwrapObservable(val.data);

	    	if(!utils.isWidget(widget))
	    		throw new TypeError('Model property is not widget!');
	    	if(val.type && val.type != widget._widgetName)
	    		throw new TypeError('Widget type is not equal to declaration! (' + val.type + ' != ' + widget._widgetName + ')');

	    	if (!widget.savedNodes)
		    	widget.savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(elem),true);
		    if (!widget.nodesBindingContext)
			    widget.nodesBindingContext = bindingContext;

	    	elem._widget = widget;
	    	ko.renderTemplate('main', bindingContext.extend({
	    		$data: widget,
	    		$root: widget,
	    		filters: filters,
	    		templates: widget.templates
	    	}), {}, elem, 'replaceChildren');
	    	if(widget.domDestroy)
	    		ko.utils.domNodeDisposal.addDisposeCallback(elem, function(){
	    			widget.domDestroy(elem, val);
	    			delete elem._widget;
	    		});
	    	if(widget.domInit)
	    		widget.domInit(elem, val);
	    	return { controlsDescendantBindings: true };
		}

		function update(elem, valueAccessor, allBindingsAccessor, viewModel, bindingContext){
	    	var val = valueAccessor();
	    	var widget = ko.utils.unwrapObservable(val.data);

	    	if(elem._widget !== widget){
	    		elem._widget.domDestroy(elem, val);
	    		init(elem, valueAccessor, allBindingsAccessor, viewModel);
	    	}
		}

		ko.bindingHandlers.widget = { init: init, update: update };
		ko.virtualElements.allowedBindings.widget = true;
	}

	function koDomNodesBindingInit() {
		ko.bindingHandlers.domNodes = {
			init: function() {
				return { controlsDescendantBindings: true };
			},
			update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				var nodes = ko.utils.unwrapObservable(valueAccessor());
				ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(nodes));
				ko.applyBindingsToDescendants(viewModel.nodesBindingContext,element);
			}
		}
		ko.virtualElements.allowedBindings.domNodes = true;
	}

	function koTemplateEngineInit(){
		var WidgetTemplate = function(template){
			this.name = template;
		};
		WidgetTemplate.prototype.text = function(){
			return this.templates ? this.templates[this.name] : '';
		};
		var WidgetTemplateEngine = function(){
			WidgetTemplateEngine.super_.apply(this);
		};
		utils.inherits(WidgetTemplateEngine, ko.nativeTemplateEngine);
		WidgetTemplateEngine.prototype.makeTemplateSource = function(template){
			return new WidgetTemplate(template);
		};
		WidgetTemplateEngine.prototype._origRenderTemplateSource = WidgetTemplateEngine.prototype.renderTemplateSource;
		WidgetTemplateEngine.prototype.renderTemplateSource = function(templateSource, bindingContext, options){
			templateSource.templates = bindingContext.templates;
			return this._origRenderTemplateSource(templateSource, bindingContext, options);
		};

		ko.setTemplateEngine(new WidgetTemplateEngine);
	}

	function appInit(widget, doc){
		koWidgetBindingInit();
		koDomNodesBindingInit();
		koTemplateEngineInit();
		ko.applyBindings(widget, doc.documentElement);
		if(widget.domInit)
			widget.domInit(doc.documentElement);
	}

	return {
		appInit: appInit
	};
});
