importPackage(Packages.java.awt);
importPackage(Packages.java.awt.event);
importPackage(Packages.java.lang);
importPackage(Packages.javax.swing);

importPackage(Packages.org.concord.mw2d.models);
importPackage(Packages.org.concord.modeler);
importPackage(Packages.org.concord.modeler.event);
importPackage(Packages.org.concord.framework.otrunk);
importPackage(Packages.org.concord.framework.data.stream);

var runButton;
var stopButton;
var resetButton;
var timeSlider;
var cupTempSlider;
var counterTempSlider;
var glassRadioBtn;
var metalRadioBtn;
var woodRadioBtn;
var stopTime;

var hotCounter = false;

////
//
// variables for graph
//
////
var timer;

var ws_values = datastore_ws.getValues();
var pl_values = datastore_pl.getValues();

var temp_ws = 0;
var temp_pl = 0;

var temp_ws_scaler = 1;
var temp_pl_scaler = 1;

var a = 0.10; // what part of the current actual temperature to use in the smoothed temp
var f = 7/2.8; // K.E. scale factor
var n = (1.6/1.38 * 10000.00); // ~ number of deg K in 1 eV
var b = 0; // increment degC by this amount
var m1 = 1;
var m2 = 0.02;
var constant = 0;   // 273
var timeCounter = 0;
var xMax = 60;
var yMax = 50;
var yMin = -2;
var xMin = -2;

var stepTime = 200;  // how often to take a sample, in ms
var counterIncrement = stepTime/1000;

var page = modelComponent.getComponent(0);
var model;

// Set up listeners on Sliders
var cupSliderListener = new OTChangeListener() {
	stateChanged: function(event) {
		var val = event.getValue();
		var script = "select element 1;\nset kelvin " + val + "*2;\nselect element none;"
		model.runScript(script);
	}
}

var counterSliderListener = new OTChangeListener() {
	stateChanged: function(event) {
		var val = event.getValue();
		var script = "select element 2;\nset kelvin " + val + "*3;\nselect element none;"
		model.runScript(script);
	}
}

cupTempSlider.addOTChangeListener(cupSliderListener);
counterTempSlider.addOTChangeListener(counterSliderListener);

// Set up listener on OTChoice (counter type choice)
var counterTypeListener = new OTChangeListener() {
	stateChanged: function(event) {
		var type = getCurrentlySelectedCounter();
		var epsi = 0.07;
		if (type.equals("wood")) {
			epsi = 0.01;
		}
		else if (type.equals("metal")) {
			epsi = 0.4;
		}
		model.runScript("define %epsi " + epsi + "; reset;");
	}
}
counterType.addOTChangeListener(counterTypeListener);

var pageListener = new PageListener() {
	pageUpdate: function(event) {
		if (event.getType() == PageEvent.PAGE_READ_END) {
			postMWInit();
		}
	}
}
page.addPageListener(pageListener);

var resetButtonHandler =
{
	actionPerformed :function(evt)
	{
			if (timer.isRunning())
			{
				end_run();
				timer.stop();
			}
			resetGraph();
			// change the values on the sliders to trigger updating the model to the correct temps
			cupVal = cupTempSlider.getValue();
			cupTempSlider.setValue(cupVal+1);
			cupTempSlider.setValue(cupVal);
			counterVal = counterTempSlider.getValue()
			counterTempSlider.setValue(counterVal+1);
			counterTempSlider.setValue(counterVal);
	}
}
var resetButtonListener = new ActionListener(resetButtonHandler);

var modelListener = new ModelListener() {
	modelUpdate: function(event) {
		if (event.getID() == ModelEvent.MODEL_RESET || event.getID() == ModelEvent.MODEL_INPUT) {
			if (timer.isRunning())
			{
				end_run();
				timer.stop();
			}
			resetGraph();
		} else if (event.getID() == ModelEvent.MODEL_RUN) {
			if (! timer.isRunning()) {
				stopTime = timeSlider.getValue()*60;
				if (timeCounter == 0) {
						resetGraph();
						start_run();
				}
				
				timer.start();
			}
		} else if (event.getID() == ModelEvent.MODEL_STOP) {
			if (timer.isRunning())
			{
				end_run();
				timer.stop();
			}
		}
	}
}

var timerHandler =
{ 
	actionPerformed:function(evt)
	{
		if (! model.isRunning()) {
			end_run();
			timer.stop();
		}
		
 		if (timeCounter == 0) {
			// for some reason the temp recorded here is always substantially lower than the temp the sliders are set to
			// so using our first recording, calculate a scaling factor
			
			try {
 				temp_ws = getCurrentTempForType(Element.ID_WS) * temp_ws_scaler;
 				temp_pl = getCurrentTempForType(Element.ID_PL) * temp_pl_scaler;
			} catch (error) {
				// bad to have an error this early in the run
				// skip this tick
				return;
			}
			hotCounter = false;
			if (temp_ws > temp_pl) {
				// counter temp is greater than the cup
				hotCounter = true;
			}
		
		} else {
			// calculate the exponential moving average
			try {
				temp_ws = a*(getCurrentTempForType(Element.ID_WS)*temp_ws_scaler)+(1-a)*temp_ws;
			} catch (error) {
				// skip this tick, use the previous value
				System.err.println("Skipping tick (ws) " + timeCounter);
			}
			
			try {
				temp_pl = a*(getCurrentTempForType(Element.ID_PL)*temp_pl_scaler)+(1-a)*temp_pl;
			} catch (error) {
				// skip this tick, use the previous value
				System.err.println("Skipping tick (pl) " + timeCounter);
			}
			// temp_ws = getCurrentTempForType(Element.ID_WS) * temp_ws_scaler;
			// temp_pl = getCurrentTempForType(Element.ID_PL) * temp_pl_scaler;
			
 		}
 		
 		graphValues(temp_ws, temp_pl);
 		timeCounter += counterIncrement;
		
		// graph.repaint()
		
		if (timeCounter > stopTime) {
			end_run();
			timer.stop();
			model.stop();
		}
		// if (timeCounter>30) {
		if (hotCounter) {
			if (Math.round(temp_pl) >= Math.round(temp_ws)) {
					end_run();
					model.stop();
					timer.stop();
			}
		} else {
			if (Math.round(temp_pl) <= Math.round(temp_ws)) {
					end_run();
					model.stop();
					timer.stop();
			}
		}
		// }
	}
}
var timerListener = new ActionListener(timerHandler);

function init() {
	timer = new Timer(stepTime, timerListener);

	init_logging();
	return true;
}

function postMWInit() {
	
	var pageComps = page.getEmbeddedComponent(Class.forName("org.concord.modeler.PageButton")).values().toArray();
	if (pageComps != null) {
		for (var i = 0; i < pageComps.length; i++) {
			var obj = pageComps[i];
			if (obj.getText().equals("Reset")) {
				resetButton = obj;
			}
		}
	}
	resetButton.addActionListener(resetButtonListener);
	
	var models = page.getEmbeddedComponent(Class.forName("org.concord.modeler.ModelCanvas")).values().toArray();
	if (models != null) {
		for (var i = 0; i < models.length; i++) {
			model = models[i].getContainer().getModel();
			model.addModelListener(modelListener);
		}
	}
	
	initialGraph();
	resetGraph();
}

function save() {
	finalize_logging();
	return true;
}

function getCurrentTempForType(type) {
	return ((1*m2)*(n*f*model.getKinForType(type)-constant)+b*1);
}

function initialGraph()
{
	graph.setLimitsAxisWorld(xMin,xMax,yMin,yMax);
	graph.getGrid().getYGrid().setInterval(5);
	graph.getGrid().getXGrid().setInterval(5);
 	// graph.getGrid().getXGrid().setAxisLabel("Time (sec) ");
 	// graph.getGrid().getYGrid().setAxisLabel("Temperature (C) ");
	graph.getToolBar().setVisible(false);
}

function resetGraph() {
	
	graph.reset();
	
	// temp_ws = getCurrentTempForType(Element.ID_WS);
	// temp_pl = getCurrentTempForType(Element.ID_PL);
	// graphHeater(temp_ws, temp_pl);
	
	timeCounter = 0;
	yMax = 100;
	xMax = 56;
	graph.setLimitsAxisWorld(xMin,xMax,yMin,yMax);
}

function graphValues(t_ws, t_pl)
{
	if (t_ws != b) {
		ws_values.add(new Float(timeCounter));
		ws_values.add(new Float(t_ws));
	}
	
	if (t_pl != b) {
		pl_values.add(new Float(timeCounter));
		pl_values.add(new Float(t_pl));
	}
	
	resizeGraph(t_ws, t_pl);
	graph.repaint();
}

function resizeGraph(t1, t2) {
	var max = maximum(t1, t2);
	
	if (max > (yMax-5)) {
		yMax = (max+5);
	}
	
	if (timeCounter > (xMax - 5)) {
		xMax = (timeCounter + 5);
	}
	graph.setLimitsAxisWorld(xMin,xMax,yMin,yMax);
}

function maximum(v1, v2) {
	if (v2 > v1) {
		return v2;
	}
	
	return v1;
}

function graphHeater(t_ws,t_pl)
{
	graph.reset();
	graphValues(t_ws, t_pl);
	graph.repaint();
}

// for logging
var mad;
var modelruns;
var current_run;
var ci_array = new Object();
var ra_array = new Object();

function init_logging() {
	// set up MAD
	mad = context.getOTObject("org.concord.otrunk.modelactivitydata.OTModelActivityData");
	otContents.add(mad);
	
    mad.setName("Thermodynamics Temperature Conductivity Model");
    modelruns = mad.getModelRuns();
    
    mad.setStartTime(now());
    
	// set up CI's
	// counter temp
	add_computational_input("Counter Temperature", "degC", "0", "100");
	// cup temp
	add_computational_input("Cup Temperature", "degC", "0", "100");
	// observation time
	add_computational_input("Observation Time", "min", "0", "15");
	// counter type
	add_computational_input("Counter Type", "", "", "");
	
	// set up RA's
}

function start_run() {
	if (current_run != null) {
		end_run();
	}
		current_run = context.getOTObject("org.concord.otrunk.modelactivitydata.OTModelRun");
		modelruns.add(current_run);
	  	current_run.setStartTime(now());
	  	
	  	// log all the ci's
	  	log_ci("Counter Temperature", counterTempSlider.getValue()*10);
		log_ci("Cup Temperature", cupTempSlider.getValue()*10);
		log_ci("Observation Time", timeSlider.getValue());
		log_ci("Counter Type", getCurrentlySelectedCounter());
}

function getCurrentlySelectedCounter() {
	return counterType.getCurrentChoice().getText();
}

function end_run() {
	if (current_run != null) {
		current_run.setEndTime(now());
		// current_run = null;
	}
}

function add_computational_input(ci_name, units, min, max) {
	var comp_inputs = mad.getComputationalInputs();
    // new comp_input
    var ci = context.getOTObject("org.concord.otrunk.modelactivitydata.OTComputationalInput");
    ci.setName(ci_name);
    ci.setUnits(units);

	var range = context.getOTObject("org.concord.otrunk.modelactivitydata.OTRange");
	range.setMinValue(min); // lower case
	range.setMaxValue(max); // upper case
	ci.setRange(range);
    
    // add to comp_inputs
    comp_inputs.add(ci);
    
    // add to ci_array
    ci_array[ci_name] = ci;
}

function log_ci(ci_idx, value) {
	if (current_run == null) { start_run(); }
	
	var ci = ci_array[ci_idx];
	var civ = context.getOTObject("org.concord.otrunk.modelactivitydata.OTComputationalInputValue");
	civ.setTime(now());
	civ.setValue(value);
	civ.setReference(ci);
	current_run.getComputationalInputValues().add(civ);
}

function finalize_logging() {
	end_run();
	mad.setEndTime(now());
}

function now() {
	return System.currentTimeMillis();
}