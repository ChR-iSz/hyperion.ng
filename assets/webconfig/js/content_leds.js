var ledsCustomCfgInitialized = false;
var finalLedArray = [];
var conf_editor = null;
var aceEdt = null;

function round(number) {
  var factor = Math.pow(10, 4);
  var tempNumber = number * factor;
  var roundedTempNumber = Math.round(tempNumber);
  return roundedTempNumber / factor;
};

function createLedPreview(leds, origin) {
  if (origin == "classic") {
    $('#previewcreator').html($.i18n('conf_leds_layout_preview_originCL'));
    $('#leds_preview').css("padding-top", "56.25%");
  }
  else if (origin == "text") {
    $('#previewcreator').html($.i18n('conf_leds_layout_preview_originTEXT'));
    $('#leds_preview').css("padding-top", "56.25%");
  }
  else if (origin == "matrix") {
    $('#previewcreator').html($.i18n('conf_leds_layout_preview_originMA'));
    $('#leds_preview').css("padding-top", "100%");
  }

  $('#previewledcount').html($.i18n('conf_leds_layout_preview_totalleds', leds.length));
  $('#previewledpower').html($.i18n('conf_leds_layout_preview_ledpower', ((leds.length * 0.06) * 1.1).toFixed(1)));

  $('.st_helper').css("border", "8px solid grey");

  var canvas_height = $('#leds_preview').innerHeight();
  var canvas_width = $('#leds_preview').innerWidth();

  var leds_html = "";
  for (var idx = 0; idx < leds.length; idx++) {
    var led = leds[idx];
    var led_id = 'ledc_' + [idx];
    var bgcolor = "background-color:hsla(" + (idx * 360 / leds.length) + ",100%,50%,0.75);";
    var pos = "left:" + (led.hmin * canvas_width) + "px;" +
      "top:" + (led.vmin * canvas_height) + "px;" +
      "width:" + ((led.hmax - led.hmin) * (canvas_width - 1)) + "px;" +
      "height:" + ((led.vmax - led.vmin) * (canvas_height - 1)) + "px;";
    leds_html += '<div id="' + led_id + '" class="led" style="' + bgcolor + pos + '" title="' + idx + '"><span id="' + led_id + '_num" class="led_prev_num">' + ((led.name) ? led.name : idx) + '</span></div>';
  }
  $('#leds_preview').html(leds_html);
  $('#ledc_0').css({ "background-color": "black", "z-index": "12" });
  $('#ledc_1').css({ "background-color": "grey", "z-index": "11" });
  $('#ledc_2').css({ "background-color": "#A9A9A9", "z-index": "10" });

  if ($('#leds_prev_toggle_num').hasClass('btn-success'))
    $('.led_prev_num').css("display", "inline");

  // update ace Editor content
  aceEdt.set(finalLedArray);
}

function createClassicLedLayoutSimple(ledstop, ledsleft, ledsright, ledsbottom, position, reverse) {
  let params = {
    ledstop: 0, ledsleft: 0, ledsright: 0, ledsbottom: 0,
    ledsglength: 0, ledsgpos: 0, position: 0,
    ledsHDepth: 0.08, ledsVDepth: 0.05, overlap: 0,
    edgeVGap: 0,
    ptblh: 0, ptblv: 1, ptbrh: 1, ptbrv: 1,
    pttlh: 0, pttlv: 0, pttrh: 1, pttrv: 0,
    reverse: false
  };

  params.ledstop = ledstop;
  params.ledsleft = ledsleft;
  params.ledsright = ledsright;
  params.ledsbottom = ledsbottom;
  params.position = position;
  params.reverse = reverse;

  return createClassicLedLayout(params);
}

function createClassicLedLayout(params) {
  //helper
  var edgeHGap = params.edgeVGap / (16 / 9);
  var ledArray = [];

  function createFinalArray(array) {
    var finalLedArray = [];
    for (var i = 0; i < array.length; i++) {
      var hmin = array[i].hmin;
      var hmax = array[i].hmax;
      var vmin = array[i].vmin;
      var vmax = array[i].vmax;
      finalLedArray[i] = { "hmax": hmax, "hmin": hmin, "vmax": vmax, "vmin": vmin }
    }
    return finalLedArray;
  }

  function rotateArray(array, times) {
    if (times > 0) {
      while (times--) {
        array.push(array.shift())
      }
      return array;
    }
    else {
      while (times++) {
        array.unshift(array.pop())
      }
      return array;
    }
  }

  function valScan(val) {
    if (val > 1)
      return 1;
    if (val < 0)
      return 0;
    return val;
  }

  function ovl(scan, val) {
    if (scan == "+")
      return valScan(val += params.overlap);
    else
      return valScan(val -= params.overlap);
  }

  function createLedArray(hmin, hmax, vmin, vmax) {
    hmin = round(hmin);
    hmax = round(hmax);
    vmin = round(vmin);
    vmax = round(vmax);
    ledArray.push({ "hmin": hmin, "hmax": hmax, "vmin": vmin, "vmax": vmax });
  }

  function createTopLeds() {
    var steph = (params.pttrh - params.pttlh - (2 * edgeHGap)) / params.ledstop;
    var stepv = (params.pttrv - params.pttlv) / params.ledstop;

    for (var i = 0; i < params.ledstop; i++) {
      var hmin = ovl("-", params.pttlh + (steph * Number([i])) + edgeHGap);
      var hmax = ovl("+", params.pttlh + (steph * Number([i + 1])) + edgeHGap);
      var vmin = params.pttlv + (stepv * Number([i]));
      var vmax = vmin + params.ledsHDepth;
      createLedArray(hmin, hmax, vmin, vmax);
    }
  }

  function createRightLeds() {
    var steph = (params.ptbrh - params.pttrh) / params.ledsright;
    var stepv = (params.ptbrv - params.pttrv - (2 * params.edgeVGap)) / params.ledsright;

    for (var i = 0; i < params.ledsright; i++) {
      var hmax = params.pttrh + (steph * Number([i + 1]));
      var hmin = hmax - params.ledsVDepth;
      var vmin = ovl("-", params.pttrv + (stepv * Number([i])) + params.edgeVGap);
      var vmax = ovl("+", params.pttrv + (stepv * Number([i + 1])) + params.edgeVGap);
      createLedArray(hmin, hmax, vmin, vmax);
    }
  }

  function createBottomLeds() {
    var steph = (params.ptbrh - params.ptblh - (2 * edgeHGap)) / params.ledsbottom;
    var stepv = (params.ptbrv - params.ptblv) / params.ledsbottom;

    for (var i = params.ledsbottom - 1; i > -1; i--) {
      var hmin = ovl("-", params.ptblh + (steph * Number([i])) + edgeHGap);
      var hmax = ovl("+", params.ptblh + (steph * Number([i + 1])) + edgeHGap);
      var vmax = params.ptblv + (stepv * Number([i]));
      var vmin = vmax - params.ledsHDepth;
      createLedArray(hmin, hmax, vmin, vmax);
    }
  }

  function createLeftLeds() {
    var steph = (params.ptblh - params.pttlh) / params.ledsleft;
    var stepv = (params.ptblv - params.pttlv - (2 * params.edgeVGap)) / params.ledsleft;

    for (var i = params.ledsleft - 1; i > -1; i--) {
      var hmin = params.pttlh + (steph * Number([i]));
      var hmax = hmin + params.ledsVDepth;
      var vmin = ovl("-", params.pttlv + (stepv * Number([i])) + params.edgeVGap);
      var vmax = ovl("+", params.pttlv + (stepv * Number([i + 1])) + params.edgeVGap);
      createLedArray(hmin, hmax, vmin, vmax);
    }
  }

  //rectangle
  createTopLeds();
  createRightLeds();
  createBottomLeds();
  createLeftLeds();

  //check led gap pos
  if (params.ledsgpos + params.ledsglength > ledArray.length) {
    var mpos = Math.max(0, ledArray.length - params.ledsglength);
    //$('#ip_cl_ledsgpos').val(mpos);
    ledsgpos = mpos;
  }

  //check led gap length
  if (params.ledsglength >= ledArray.length) {
    //$('#ip_cl_ledsglength').val(ledArray.length-1);
    params.ledsglength = ledArray.length - params.ledsglength - 1;
  }

  if (params.ledsglength != 0) {
    ledArray.splice(params.ledsgpos, params.ledsglength);
  }

  if (params.position != 0) {
    rotateArray(ledArray, params.position);
  }

  if (params.reverse)
    ledArray.reverse();

  return createFinalArray(ledArray);
}

function createClassicLeds() {
  //get values
  let params = {
    ledstop: parseInt($("#ip_cl_top").val()),
    ledsbottom: parseInt($("#ip_cl_bottom").val()),
    ledsleft: parseInt($("#ip_cl_left").val()),
    ledsright: parseInt($("#ip_cl_right").val()),
    ledsglength: parseInt($("#ip_cl_glength").val()),
    ledsgpos: parseInt($("#ip_cl_gpos").val()),
    position: parseInt($("#ip_cl_position").val()),
    reverse: $("#ip_cl_reverse").is(":checked"),

    //advanced values
    ledsVDepth: parseInt($("#ip_cl_vdepth").val()) / 100,
    ledsHDepth: parseInt($("#ip_cl_hdepth").val()) / 100,
    edgeVGap: parseInt($("#ip_cl_edgegap").val()) / 100 / 2,
    //cornerVGap : parseInt($("#ip_cl_cornergap").val())/100/2,
    overlap: $("#ip_cl_overlap").val() / 100,

    //trapezoid values % -> float
    ptblh: parseInt($("#ip_cl_pblh").val()) / 100,
    ptblv: parseInt($("#ip_cl_pblv").val()) / 100,
    ptbrh: parseInt($("#ip_cl_pbrh").val()) / 100,
    ptbrv: parseInt($("#ip_cl_pbrv").val()) / 100,
    pttlh: parseInt($("#ip_cl_ptlh").val()) / 100,
    pttlv: parseInt($("#ip_cl_ptlv").val()) / 100,
    pttrh: parseInt($("#ip_cl_ptrh").val()) / 100,
    pttrv: parseInt($("#ip_cl_ptrv").val()) / 100,
  }

  finalLedArray = createClassicLedLayout(params);

  //check led gap pos
  if (params.ledsgpos + params.ledsglength > finalLedArray.length) {
    var mpos = Math.max(0, finalLedArray.length - params.ledsglength);
    $('#ip_cl_ledsgpos').val(mpos);
  }
  //check led gap length
  if (params.ledsglength >= finalLedArray.length) {
    $('#ip_cl_ledsglength').val(finalLedArray.length - 1);
  }

  createLedPreview(finalLedArray, 'classic');
}

function createMatrixLayout(ledshoriz, ledsvert, cabling, start) {
  // Big thank you to RanzQ (Juha Rantanen) from Github for this script
  // https://raw.githubusercontent.com/RanzQ/hyperion-audio-effects/master/matrix-config.js

  var parallel = false
  var leds = []
  var hblock = 1.0 / ledshoriz
  var vblock = 1.0 / ledsvert

  if (cabling == "parallel") {
    parallel = true
  }

  /**
   * Adds led to the hyperion config led array
   * @param {Number} x     Horizontal position in matrix
   * @param {Number} y     Vertical position in matrix
   */
  function addLed(x, y) {
    var hscanMin = x * hblock
    var hscanMax = (x + 1) * hblock
    var vscanMin = y * vblock
    var vscanMax = (y + 1) * vblock

    hscanMin = round(hscanMin);
    hscanMax = round(hscanMax);
    vscanMin = round(vscanMin);
    vscanMax = round(vscanMax);

    leds.push({
      hmin: hscanMin,
      hmax: hscanMax,
      vmin: vscanMin,
      vmax: vscanMax
    })
  }

  var startYX = start.split('-')
  var startX = startYX[1] === 'right' ? ledshoriz - 1 : 0
  var startY = startYX[0] === 'bottom' ? ledsvert - 1 : 0
  var endX = startX === 0 ? ledshoriz - 1 : 0
  var endY = startY === 0 ? ledsvert - 1 : 0
  var forward = startX < endX

  var downward = startY < endY

  var x, y

  for (y = startY; downward && y <= endY || !downward && y >= endY; y += downward ? 1 : -1) {
    for (x = startX; forward && x <= endX || !forward && x >= endX; x += forward ? 1 : -1) {
      addLed(x, y)
    }
    if (!parallel) {
      forward = !forward
      var tmp = startX
      startX = endX
      endX = tmp
    }
  }

  return leds;
}

function createMatrixLeds() {
  // Big thank you to RanzQ (Juha Rantanen) from Github for this script
  // https://raw.githubusercontent.com/RanzQ/hyperion-audio-effects/master/matrix-config.js

  //get values
  var ledshoriz = parseInt($("#ip_ma_ledshoriz").val());
  var ledsvert = parseInt($("#ip_ma_ledsvert").val());
  var cabling = $("#ip_ma_cabling").val();
  var start = $("#ip_ma_start").val();

  finalLedArray = createMatrixLayout(ledshoriz, ledsvert, cabling, start);
  createLedPreview(finalLedArray, 'matrix');
}

function migrateLedConfig(slConfig) {
  var newLedConfig = { classic: {}, matrix: {} };

  //Default Classic layout
  newLedConfig.classic = {
    "top": 1,
    "bottom": 0,
    "left": 0,
    "right": 0,
    "glength": 0,
    "gpos": 0,
    "position": 0,
    "reverse": false,
    "hdepth": 8,
    "vdepth": 5,
    "overlap": 0,
    "edgegap": 0
  }

  //Move Classic layout
  newLedConfig.classic.top = slConfig.top;
  newLedConfig.classic.bottom = slConfig.bottom;
  newLedConfig.classic.left = slConfig.left;
  newLedConfig.classic.right = slConfig.right;
  newLedConfig.classic.glength = slConfig.glength;
  newLedConfig.classic.position = slConfig.position;
  newLedConfig.classic.reverse = slConfig.reverse;
  newLedConfig.classic.hdepth = slConfig.hdepth;
  newLedConfig.classic.vdepth = slConfig.vdepth;
  newLedConfig.classic.overlap = slConfig.overlap;

  //Default Matrix layout
  newLedConfig["matrix"] = {
    "ledshoriz": 1,
    "ledsvert": 1,
    "cabling": "snake",
    "start": "top-left"
  }

  // Persit new structure
  requestWriteConfig({ ledConfig: newLedConfig })
  return newLedConfig
}

function isEmpty(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key))
      return false;
  }
  return true;
}

$(document).ready(function () {
  // translate
  performTranslation();

  //add intros
  if (window.showOptHelp) {
    createHintH("intro", $.i18n('conf_leds_device_intro'), "leddevice_intro");
    createHintH("intro", $.i18n('conf_leds_layout_intro'), "layout_intro");
    $('#led_vis_help').html('<div><div class="led_ex" style="background-color:black;margin-right:5px;margin-top:3px"></div><div style="display:inline-block;vertical-align:top">' + $.i18n('conf_leds_layout_preview_l1') + '</div></div><div class="led_ex" style="background-color:grey;margin-top:3px;margin-right:2px"></div><div class="led_ex" style="background-color: rgb(169, 169, 169);margin-right:5px;margin-top:3px;"></div><div style="display:inline-block;vertical-align:top">' + $.i18n('conf_leds_layout_preview_l2') + '</div>');
  }

  var slConfig = window.serverConfig.ledConfig;

  //Check, if structure is not aligned to expected -> migrate structure

  if (isEmpty(slConfig.classic)) {
    slConfig = migrateLedConfig(slConfig);
  }

  //restore ledConfig - Classic
  for (var key in slConfig.classic) {
    if (typeof (slConfig.classic[key]) === "boolean")
      $('#ip_cl_' + key).prop('checked', slConfig.classic[key]);
    else
      $('#ip_cl_' + key).val(slConfig.classic[key]);
  }

  //restore ledConfig - Matrix
  for (var key in slConfig.matrix) {
    if (typeof (slConfig.matrix[key]) === "boolean")
      $('#ip_ma_' + key).prop('checked', slConfig.matrix[key]);
    else
      $('#ip_ma_' + key).val(slConfig.matrix[key]);
  }

  function saveValues() {
    var ledConfig = { classic: {}, matrix: {} };

    for (var key in slConfig.classic) {
      if (typeof (slConfig.classic[key]) === "boolean")
        ledConfig.classic[key] = $('#ip_cl_' + key).is(':checked');
      else if (Number.isInteger(slConfig.classic[key]))
        ledConfig.classic[key] = parseInt($('#ip_cl_' + key).val());
      else
        ledConfig.classic[key] = $('#ip_cl_' + key).val();
    }

    for (var key in slConfig.matrix) {
      if (typeof (slConfig.matrix[key]) === "boolean")
        ledConfig.matrix[key] = $('#ip_ma_' + key).is(':checked');
      else if (Number.isInteger(slConfig.matrix[key]))
        ledConfig.matrix[key] = parseInt($('#ip_ma_' + key).val());
      else
        ledConfig.matrix[key] = $('#ip_ma_' + key).val();
    }
    requestWriteConfig({ ledConfig });
  }

  // check access level and adjust ui
  if (storedAccess == "default") {
    $('#texfield_panel').toggle(false);
    $('#previewcreator').toggle(false);
  }

  //Wiki link
  $('#leds_wl').append('<p style="font-weight:bold">' + $.i18n('general_wiki_moreto', $.i18n('conf_leds_nav_label_ledlayout')) + buildWL("user/advanced/Advanced.html#led-layout", "Wiki") + '</p>');

  // bind change event to all inputs
  $('.ledCLconstr').bind("change", function () {
    valValue(this.id, this.value, this.min, this.max);
    createClassicLeds();
  });

  $('.ledMAconstr').bind("change", function () {
    valValue(this.id, this.value, this.min, this.max);
    createMatrixLeds();
  });

  // v4 of json schema with diff required assignment - remove when hyperion schema moved to v4
  var ledschema = { "items": { "additionalProperties": false, "required": ["hmin", "hmax", "vmin", "vmax"], "properties": { "name": { "type": "string" }, "colorOrder": { "enum": ["rgb", "bgr", "rbg", "brg", "gbr", "grb"], "type": "string" }, "hmin": { "maximum": 1, "minimum": 0, "type": "number" }, "hmax": { "maximum": 1, "minimum": 0, "type": "number" }, "vmin": { "maximum": 1, "minimum": 0, "type": "number" }, "vmax": { "maximum": 1, "minimum": 0, "type": "number" } }, "type": "object" }, "type": "array" };
  //create jsonace editor
  aceEdt = new JSONACEEditor(document.getElementById("aceedit"), {
    mode: 'code',
    schema: ledschema,
    onChange: function () {
      var success = true;
      try {
        aceEdt.get();
      }
      catch (err) {
        success = false;
      }

      if (success) {
        $('#leds_custom_updsim').attr("disabled", false);
        $('#leds_custom_save').attr("disabled", false);
      }
      else {
        $('#leds_custom_updsim').attr("disabled", true);
        $('#leds_custom_save').attr("disabled", true);
      }

      if (window.readOnlyMode) {
        $('#leds_custom_save').attr('disabled', true);
      }
    }
  }, window.serverConfig.leds);

  //TODO: HACK! No callback for schema validation - Add it!
  setInterval(function () {
    if ($('#aceedit table').hasClass('jsoneditor-text-errors')) {
      $('#leds_custom_updsim').attr("disabled", true);
      $('#leds_custom_save').attr("disabled", true);
    }
  }, 1000);

  $('.jsoneditor-menu').toggle();

  // External properties properties, 2-dimensional arry of [ledType][key]
  devicesProperties = {};

  // leds to finalLedArray
  finalLedArray = window.serverConfig.leds;

  // create and update editor
  $("#leddevices").off().on("change", function () {
    var generalOptions = window.serverSchema.properties.device;

    var ledType = $(this).val();

    //philipshueentertainment backward fix
    if (ledType == "philipshueentertainment")
      ledType = "philipshue";

    var specificOptions = window.serverSchema.properties.alldevices[ledType];

    conf_editor = createJsonEditor('editor_container_leddevice', {
      specificOptions: specificOptions,
      generalOptions: generalOptions,
    });

    var values_general = {};
    var values_specific = {};
    var isCurrentDevice = (window.serverConfig.device.type == ledType);

    for (var key in window.serverConfig.device) {
      if (key != "type" && key in generalOptions.properties) values_general[key] = window.serverConfig.device[key];
    };
    conf_editor.getEditor("root.generalOptions").setValue(values_general);

    if (isCurrentDevice) {
      var specificOptions_val = conf_editor.getEditor("root.specificOptions").getValue();
      for (var key in specificOptions_val) {
        values_specific[key] = (key in window.serverConfig.device) ? window.serverConfig.device[key] : specificOptions_val[key];
      };
      conf_editor.getEditor("root.specificOptions").setValue(values_specific);
    };

    // change save button state based on validation result
    conf_editor.validate().length || window.readOnlyMode ? $('#btn_submit_controller').attr('disabled', true) : $('#btn_submit_controller').attr('disabled', false);

    // led controller sepecific wizards
    $('#btn_wiz_holder').html("");
    $('#btn_led_device_wiz').off();

    if (ledType == "philipshue") {
      $('#root_specificOptions_useEntertainmentAPI').bind("change", function () {
        var ledWizardType = (this.checked) ? "philipshueentertainment" : ledType;
        var data = { type: ledWizardType };
        var hue_title = (this.checked) ? 'wiz_hue_e_title' : 'wiz_hue_title';
        changeWizard(data, hue_title, startWizardPhilipsHue);
      });
      $("#root_specificOptions_useEntertainmentAPI").trigger("change");
    }
    else if (ledType == "atmoorb") {
      var ledWizardType = (this.checked) ? "atmoorb" : ledType;
      var data = { type: ledWizardType };
      var atmoorb_title = 'wiz_atmoorb_title';
      changeWizard(data, atmoorb_title, startWizardAtmoOrb);
    }
    /*
      else if(ledType == "cololight") {
        var ledWizardType = (this.checked) ? "cololight" : ledType;
        var data = { type: ledWizardType };
        var cololight_title = 'wiz_cololight_title';
        changeWizard(data, cololight_title, startWizardCololight);
      }
      else if(ledType == "wled") {
        var ledWizardType = (this.checked) ? "wled" : ledType;
        var data = { type: ledWizardType };
        var wled_title = 'wiz_wled_title';
        changeWizard(data, wled_title, startWizardWLED);
      }
    */
    else if (ledType == "yeelight") {
      var ledWizardType = (this.checked) ? "yeelight" : ledType;
      var data = { type: ledWizardType };
      var yeelight_title = 'wiz_yeelight_title';
      changeWizard(data, yeelight_title, startWizardYeelight);
    }

    function changeWizard(data, hint, fn) {
      $('#btn_wiz_holder').html("")
      createHint("wizard", $.i18n(hint), "btn_wiz_holder", "btn_led_device_wiz");
      $('#btn_led_device_wiz').off().on('click', data, fn);
    }

    // --------------------- B E G I N ---------------------

    conf_editor.on('ready', function () {
      debugMessage("conf_editor.on(ready)");

      switch (ledType) {
        case "adalight":
        case "cololight":
        case "wled":
        case "nanoleaf":

          discover_device(ledType);

          if (ledType !== window.serverConfig.device.type) {
            var hwLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount")
            if (hwLedCount) {
              hwLedCount.setValue(1);
            }

            var colorOrder = conf_editor.getEditor("root.generalOptions.colorOrder")
            if (colorOrder) {
              colorOrder.setValue("rgb");
            }
          }

          break;

        default:
      }
    });

    conf_editor.on('change', function () {
      //debugMessage("conf_editor.on(change)");

      // --------------------- B E G I N ---------------------

      //Check, if device can be identified/tested and/or saved
      var canIdentify = false;
      var canSave = false;

      switch (ledType) {
        case "cololight":
        case "wled":
          host = conf_editor.getEditor("root.specificOptions.host").getValue();
          if (host !== "") {
            canIdentify = true;
            canSave = true;
          }
          break;

        case "nanoleaf":
          host = conf_editor.getEditor("root.specificOptions.host").getValue();
          token = conf_editor.getEditor("root.specificOptions.token").getValue();
          if (host !== "" && token !== "") {
            canIdentify = true;
            canSave = true;
          }
          break;

        case "adalight":
          output = conf_editor.getEditor("root.specificOptions.output").getValue();
          if (output !== "NONE") {
            canIdentify = false;
            canSave = true;
          }
          break;

        default:
          canIdentify = false;
          canSave = true;
      }

      if (canIdentify) {
        $("#btn_test_controller").removeClass('hidden');
        $('#btn_test_controller').attr('disabled', false);
      }
      else {
        $('#btn_test_controller').attr('disabled', true);
      }

      if (canSave) {
        if (!window.readOnlyMode) {
          $('#btn_submit_controller').attr('disabled', false);
        }
      }
      else {
        $('#btn_submit_controller').attr('disabled', true);
      }

      // --------------------- E N D ---------------------

      window.readOnlyMode ? $('#btn_cl_save').attr('disabled', true) : $('#btn_submit').attr('disabled', false);
      window.readOnlyMode ? $('#btn_ma_save').attr('disabled', true) : $('#btn_submit').attr('disabled', false);
      window.readOnlyMode ? $('#leds_custom_save').attr('disabled', true) : $('#btn_submit').attr('disabled', false);
    });

    // --------------------- B E G I N ---------------------

    conf_editor.watch('root.specificOptions.hostList', () => {
      console.log("conf_editor.watch(), root.specificOptions.hostList, ledType: ", ledType);

      var specOptPath = 'root.specificOptions.';

      //Disable General Options, as LED count will be resolved from device itself
      conf_editor.getEditor("root.generalOptions").disable();

      var hostList = conf_editor.getEditor("root.specificOptions.hostList")
      if (hostList) {
        var val = hostList.getValue();

        if (val === 'custom' || val === "") {
          conf_editor.getEditor(specOptPath + "host").enable()
          conf_editor.getEditor(specOptPath + "host").setValue("");
        }
        else {
          conf_editor.getEditor(specOptPath + "host").disable();
          conf_editor.getEditor(specOptPath + "host").setValue(val);
        }
      }
    });

    conf_editor.watch('root.specificOptions.host', () => {
      console.log("conf_editor.watch(), root.specificOptions.host, ledType: ", ledType);

      host = conf_editor.getEditor("root.specificOptions.host").getValue();

      if (host === "") {
        conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(1);
      }
      else {
        let params = {};
        switch (ledType) {
          case "cololight":
            params = { host: host };
            break;

          case "nanoleaf":
            token = conf_editor.getEditor("root.specificOptions.token").getValue();
            if (token === "") {
              return
            }
            params = { host: host, token: token };
            break;

          case "wled":
            params = { host: host, filter: "info" };
            break;
          default:
        }

        getProperties_device(ledType, host, params);
      }
    });

    conf_editor.watch('root.specificOptions.token', () => {
      console.log("conf_editor.watch(), root.specificOptions.token, ledType: ", ledType);

      token = conf_editor.getEditor("root.specificOptions.token").getValue();

      if (token !== "") {
        let params = {};

        switch (ledType) {
          case "nanoleaf":
            host = conf_editor.getEditor("root.specificOptions.host").getValue();
            if (host === "") {
              return
            }
            params = { host: host, token: token };
            break;
          default:
        }

        getProperties_device(ledType, host, params);
      }
    });

    JSONEditor.defaults.callbacks = {
      "button": {
        "generateToken": function (jseditor, e) {
          var ledType = $("#leddevices").val();
          var host = jseditor.jsoneditor.getEditor("root.specificOptions.host").getValue();

          if (host) {
            // TODO: Implement dialog for token generation

            // TEST ONLY
            alert("Generate token for " + ledType + " device: " + host);
            var token = "qZ2cVd8PcAJwGjKQgxIf2wnEEBJaEKCt";

            jseditor.jsoneditor.getEditor("root.specificOptions.token").setValue(token);
          }
          else {
            alert("Hostname/IP-address is missing to generate token for " + ledType + " device");
          }
        }
      }
    }
    // --------------------- E N D ---------------------
  });

  //philipshueentertainment backward fix
  if (window.serverConfig.device.type == "philipshueentertainment") window.serverConfig.device.type = "philipshue";

  // create led device selection
  var ledDevices = window.serverInfo.ledDevices.available;
  var devRPiSPI = ['apa102', 'apa104', 'ws2801', 'lpd6803', 'lpd8806', 'p9813', 'sk6812spi', 'sk6822spi', 'sk9822', 'ws2812spi'];
  var devRPiPWM = ['ws281x'];
  var devRPiGPIO = ['piblaster'];

  var devNET = ['atmoorb', 'cololight', 'fadecandy', 'philipshue', 'nanoleaf', 'tinkerforge', 'tpm2net', 'udpe131', 'udpartnet', 'udph801', 'udpraw', 'wled', 'yeelight'];
  var devUSB = ['adalight', 'dmx', 'atmo', 'hyperionusbasp', 'lightpack', 'paintpack', 'rawhid', 'sedu', 'tpm2', 'karate'];

  var optArr = [[]];
  optArr[1] = [];
  optArr[2] = [];
  optArr[3] = [];
  optArr[4] = [];
  optArr[5] = [];

  for (var idx = 0; idx < ledDevices.length; idx++) {
    if ($.inArray(ledDevices[idx], devRPiSPI) != -1)
      optArr[0].push(ledDevices[idx]);
    else if ($.inArray(ledDevices[idx], devRPiPWM) != -1)
      optArr[1].push(ledDevices[idx]);
    else if ($.inArray(ledDevices[idx], devRPiGPIO) != -1)
      optArr[2].push(ledDevices[idx]);
    else if ($.inArray(ledDevices[idx], devNET) != -1)
      optArr[3].push(ledDevices[idx]);
    else if ($.inArray(ledDevices[idx], devUSB) != -1)
      optArr[4].push(ledDevices[idx]);
    else
      optArr[5].push(ledDevices[idx]);
  }

  $("#leddevices").append(createSel(optArr[0], $.i18n('conf_leds_optgroup_RPiSPI')));
  $("#leddevices").append(createSel(optArr[1], $.i18n('conf_leds_optgroup_RPiPWM')));
  $("#leddevices").append(createSel(optArr[2], $.i18n('conf_leds_optgroup_RPiGPIO')));
  $("#leddevices").append(createSel(optArr[3], $.i18n('conf_leds_optgroup_network')));
  $("#leddevices").append(createSel(optArr[4], $.i18n('conf_leds_optgroup_usb')));
  $("#leddevices").append(createSel(optArr[5], $.i18n('conf_leds_optgroup_debug')));
  $("#leddevices").val(window.serverConfig.device.type);
  $("#leddevices").trigger("change");

  // validate textfield and update preview
  $("#leds_custom_updsim").off().on("click", function () {
    createLedPreview(aceEdt.get(), 'text');
  });

  // save led config and saveValues - passing textfield
  $("#btn_ma_save, #btn_cl_save").off().on("click", function () {
    requestWriteConfig({ "leds": finalLedArray });
    saveValues();
  });

  // save led config from textfield
  $("#leds_custom_save").off().on("click", function () {
    requestWriteConfig(JSON.parse('{"leds" :' + aceEdt.getText() + '}'));
    saveValues();
  });

  // toggle led numbers
  $('#leds_prev_toggle_num').off().on("click", function () {
    $('.led_prev_num').toggle();
    toggleClass('#leds_prev_toggle_num', "btn-danger", "btn-success");
  });

  // open checklist
  $('#leds_prev_checklist').off().on("click", function () {
    var liList = [$.i18n('conf_leds_layout_checkp1'), $.i18n('conf_leds_layout_checkp3'), $.i18n('conf_leds_layout_checkp2'), $.i18n('conf_leds_layout_checkp4')];
    var ul = document.createElement("ul");
    ul.className = "checklist"

    for (var i = 0; i < liList.length; i++) {
      var li = document.createElement("li");
      li.innerHTML = liList[i];
      ul.appendChild(li);
    }
    showInfoDialog('checklist', "", ul);
  });

  // nav
  $('#leds_cfg_nav a[data-toggle="tab"]').off().on('shown.bs.tab', function (e) {
    var target = $(e.target).attr("href") // activated tab
    if (target == "#menu_gencfg" && !ledsCustomCfgInitialized) {
      $('#leds_custom_updsim').trigger('click');
      ledsCustomCfgInitialized = true;
    }
  });

  // --------------------- B E G I N ---------------------
  // Identify/ Test LED-Device
  $("#btn_test_controller").off().on("click", function () {
    var ledType = $("#leddevices").val();
    let params = {};

    switch (ledType) {
      case "cololight":
      case "wled":
        host = conf_editor.getEditor("root.specificOptions.host").getValue();
        params = { host: host };
        break;

      case "nanoleaf":
        host = conf_editor.getEditor("root.specificOptions.host").getValue();
        token = conf_editor.getEditor("root.specificOptions.token").getValue();
        params = { host: host, token: authToken };
        break;

      default:
    }

    identify_device(ledType, params);
  });
  // --------------------- E N D ---------------------

  // save led device config
  $("#btn_submit_controller").off().on("click", function (event) {
    var ledType = $("#leddevices").val();
    var result = { device: {} };

    var general = conf_editor.getEditor("root.generalOptions").getValue();
    var specific = conf_editor.getEditor("root.specificOptions").getValue();
    for (var key in general) {
      result.device[key] = general[key];
    }

    for (var key in specific) {
      result.device[key] = specific[key];
    }
    result.device.type = ledType;

    // --------------------- B E G I N ---------------------

    // Special handling per LED-type
    switch (ledType) {
      case "cololight":

        var host = conf_editor.getEditor("root.specificOptions.host").getValue();

        var hardwareLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount").getValue();
        result.device.hardwareLedCount = hardwareLedCount;

        // Generate default layout

        var ledLedConfig = [];

        debugger;

        if (devicesProperties[ledType][host].modelType === "Strip") {
          ledLedConfig = createClassicLedLayoutSimple(hardwareLedCount / 2, hardwareLedCount / 4, hardwareLedCount / 4, 0, hardwareLedCount / 4 * 3, false);
        }
        else {
          ledLedConfig = createClassicLedLayoutSimple(0, 0, 0, hardwareLedCount, 0, true);
        }
        result.leds = ledLedConfig;

        // TODO: Turn smoothing off
        //result.smoothing.enable = false;

        break;
      case "wled":

        var host = conf_editor.getEditor("root.specificOptions.host").getValue();

        var hardwareLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount").getValue();
        result.device.hardwareLedCount = hardwareLedCount;

        // Generate default layout
        var ledLedConfig = [];
        ledLedConfig = createClassicLedLayoutSimple(0, 0, 0, hardwareLedCount, 0, true);
        result.leds = ledLedConfig;

        // TODO: Turn smoothing off
        //result.smoothing.enable = false;
        break;

      case "nanoleaf":
        break;

      default:
    }
    // --------------------- E N D ---------------------

    requestWriteConfig(result)
  });

  removeOverlay();
});

// --------------------- B E G I N ---------------------

// build dynamic enum
var updateSelectList = function (ledType, discoveryInfo) {
  console.log("updateSelectList() - ledType: ", ledType, " discoveryInfo: ", discoveryInfo);

  if (!discoveryInfo.devices) {
    return;
  }

  let addSchemaElements = {
  };

  var key;
  var enumVals = [];
  var enumTitelVals = [];
  var enumDefaultVal = "";
  var addCustom = false;

  var ledTypeGroup;

  var devNET = ['atmoorb', 'cololight', 'fadecandy', 'philipshue', 'nanoleaf', 'tinkerforge', 'tpm2net', 'udpe131', 'udpartnet', 'udph801', 'udpraw', 'wled', 'yeelight'];
  var devSerial = ['adalight', 'dmx', 'atmo', 'sedu', 'tpm2', 'karate'];
  var devHID = ['hyperionusbasp', 'lightpack', 'paintpack', 'rawhid',];


  if ($.inArray(ledType, devNET) != -1) {
    ledTypeGroup = "devNET";
  } else if ($.inArray(ledType, devSerial) != -1) {
    ledTypeGroup = "devSerial";
  }

  switch (ledTypeGroup) {

    case "devNET":
      key = "hostList";

      if (discoveryInfo.devices.length === 0) {
        console.log("No Network devices discovered.");
        conf_editor.getEditor("root.specificOptions." + key).disable();
      }
      else {

        var name;

        var discoveryMethod = "ssdp";
        if (discoveryInfo.discoveryMethod) {
          discoveryMethod = discoveryInfo.discoveryMethod;
        }

        for (const device of discoveryInfo.devices) {

          var name;
          var host;
          addCustom = true;

          switch (ledType) {
            case "nanoleaf":
              if (discoveryMethod === "ssdp") {
                name = device.other["nl-devicename"];
              }
              else {
                name = device.name;
              }
              break;
            case "cololight":
              if (discoveryMethod === "ssdp") {
                name = device.hostname;
              }
              else {
                name = device.name;
              }
              break;
            case "wled":
              name = device.name;
              break;
            default:
              name = device.name;
          }

          if (discoveryMethod === "ssdp") {
            host = device.ip;
          }
          else {
            host = device.name;
          }

          enumVals.push(host);
          if (host !== name) {
            enumTitelVals.push(name + " (" + host + ")");
          }
          else {
            enumTitelVals.push(host);
          }

          addCustom = true;

          // Select configured device
          var configuredDeviceType = window.serverConfig.device.type;
          var configuredHost = window.serverConfig.device.hostList;
          if (ledType === configuredDeviceType && configuredHost) {
            enumDefaultVal = configuredHost;
          }
        }
      }
      break;

    case "devSerial":
      key = "output";
      if (discoveryInfo.devices.length == 0) {
        enumVals.push("NONE");
        enumTitelVals.push($.i18n('edt_dev_spec_devices_discovered_none'));
      }
      else {
        switch (ledType) {

          case "adalight":
            for (const device of discoveryInfo.devices) {
              enumVals.push(device.portName);
              enumTitelVals.push(device.portName + " (" + device.vendorIdentifier + "|" + device.productIdentifier + ") - " + device.manufacturer);
            }

            // Select configured device
            var configuredDeviceType = window.serverConfig.device.type;
            var configuredOutput = window.serverConfig.device.output;
            if (ledType === configuredDeviceType && configuredOutput) {
              enumDefaultVal = configuredOutput;
            }

            break;
          default:
        }
      }
      break;
    default:
  }

  if (enumVals.length > 0) {
    var specOpt = conf_editor.getEditor('root.specificOptions'); // get specificOptions of the editor
    updateJsonEditorSelection(specOpt, key, addSchemaElements, enumVals, enumTitelVals, enumDefaultVal, addCustom);
  }
   
};

async function discover_device(ledType, params) {
  console.log("discover_devices()- ledType: ", ledType, " params: ", params);

//  waitingDialog.show('Device discovery for ' + ledType + " in progress");
  const result = await requestLedDeviceDiscovery(ledType, params);
//  waitingDialog.hide();

  console.log("requestLedDeviceDiscovery(), result:", result);

  var discoveryResult;
  if (result && !result.error) {
    discoveryResult = result.info;
  }
  else {
    discoveryResult = {
      devices: [],
      ledDevicetype: ledType
    }
  }

  //mdns test
  //discoveryResult = { "devices": [{ "address": "192.168.2.165", "domain": "local.", "hostname": "MyHost-2.local.", "id": "ColoLight-D72818._hap._tcp.local.", "name": "ColoLight-D72818", "nameFull": "ColoLight-D72818._hap._tcp.local.", "port": 80, "txt": { "c#": "1", "ci": "5", "ff": "2", "id": "94:96:10:81:B8:43", "md": "LS167", "pv": "1.1", "s#": "1", "sf": "0", "sh": "4t2vFw==" }, "type": "_hap._tcp." }, { "address": "192.168.2.180", "domain": "local.", "hostname": "MyHost-10.local.", "id": "ColoLight-A41690._hap._tcp.local.", "name": "ColoLight-A41690", "nameFull": "ColoLight-A41690._hap._tcp.local.", "port": 80, "txt": { "c#": "1", "ci": "5", "ff": "2", "id": "D6:91:DE:62:39:89", "md": "LS167", "pv": "1.1", "s#": "1", "sf": "0", "sh": "YQRxrA==" }, "type": "_hap._tcp." }], "discoveryMethod": "mDNS", "ledDeviceType": "cololight" };
  //ssdp test
  //discoveryResult = { "devices": [{ "domain": "fritz.box", "hostname": "ColoLight-AC67B2D72818", "ip": "192.168.2.165", "mac": "ac:67:b2:d7:28:18", "model": "OD_WE_QUAN", "name": "QUAN", "type": "HKC32" }, { "domain": "fritz.box", "hostname": "MyHost-10", "ip": "192.168.2.180", "mac": "8c:aa:b5:a4:16:90", "model": "OD_WE_QUAN", "name": "QUAN", "type": "HKC32" }], "discoveryMethod": "ssdp", "ledDeviceType": "cololight" };


  updateSelectList(ledType, discoveryResult);
}

async function getProperties_device(ledType, key, params) {
  console.log("getProperties_device() - ledType: ", ledType, "key: ", key, " params: ", params);

  // Take care that connfig cannot be saved during background processing
  $('#btn_submit_controller').attr('disabled', true);

  //Create ledType cache entry
  if (!devicesProperties[ledType]) {
    devicesProperties[ledType] = {};
  }

  // get device's properties, if properties not available in chache
  if (!devicesProperties[ledType][host]) {

    //waitingDialog.show('Get properties for' + ledType);
    const res = await requestLedDeviceProperties(ledType, params);
    console.log("requestLedDeviceProperties(), res: ", res);
    //waitingDialog.hide();

    if (res && !res.error) {
      var deviceProperties = res.info.properties;

      if (!jQuery.isEmptyObject(deviceProperties)) {
        devicesProperties[ledType][key] = deviceProperties;

        if (!window.readOnlyMode) {
          $('#btn_submit_controller').attr('disabled', false);
        }
      }
      else {
        debugMessage("devicesProperties are empty");
        $('#btn_submit_controller').attr('disabled', true);
      }
    }
  }
  else {
    debugMessage("getProperties_device() - use cached properties as already resolved");
  }

  updateElements(ledType, key);
}

async function identify_device(type, params) {
  // Take care that connfig cannot be saved during background processing
  $('#btn_submit_controller').attr('disabled', true);

  //waitingDialog.show('Identification in progess');
  const res = await requestLedDeviceIdentification(type, params);
  console.log("requestLedDeviceIdentification(), res: ", res);
  //waitingDialog.hide();

  if (!window.readOnlyMode) {
    $('#btn_submit_controller').attr('disabled', false);
  }
}

function updateElements(ledType, key) {
  console.log("updateElements ledType: ", ledType, " key: ", key);

  if (!devicesProperties[ledType][key]) {
    console.log("updateElements - no properties, ledType: ", ledType, " key: ", key);
  }
  else {
    switch (ledType) {
      case "cololight":
        var ledProperties = devicesProperties[ledType][key];

        // TODO: Handle Strip exclicitly, as not ledNum is provided

        if (ledProperties) {
          hardwareLedCount = ledProperties.ledCount;
        }
        else {
          hardwareLedCount = 1;
        }
        conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(hardwareLedCount);
        break;
      case "wled":
        var ledProperties = devicesProperties[ledType][key];

        if (ledProperties && ledProperties.leds) {
          hardwareLedCount = ledProperties.leds.count;
        }
        else {
          hardwareLedCount = 1;
        }
        conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(hardwareLedCount);
        break;

      case "nanoleaf":
        var ledProperties = devicesProperties[ledType][key];

        if (ledProperties && ledProperties.panelLayout.layout) {
          //Identify non-LED type panels, e.g. Rhythm (1) and Shapes Controller (12)
          var nonLedNum = 0;
          for (const panel of ledProperties.panelLayout.layout.positionData) {
            if (panel.shapeType === 1 || panel.shapeType === 12) {
              nonLedNum++;
            }
          }
          hardwareLedCount = ledProperties.panelLayout.layout.numPanels - nonLedNum;
        }
        else {
          hardwareLedCount = 1;
        }
        conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(hardwareLedCount);

        break;

      default:
    }
  }
}

// --------------------- E N D --------------------
