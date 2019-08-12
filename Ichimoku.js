var log = require('../core/log');
var config = require ('../core/util.js').getConfig();
var Ichimoku = require("ichimoku");

var strat = {};

// Prepare everything our method needs
strat.init = function() {
    this.ichimoku = new Ichimoku({
        conversionPeriod : this.settings.conversionPeriod,
        basePeriod       : this.settings.basePeriod,
        spanPeriod       : this.settings.spanPeriod,
        displacement     : this.settings.displacement,
        values           : []
    });

    this.requiredHistory = 82;
    this.oldIchimokuValue = null;
    this.ichimokuValue = null;
    this.wait_price_over_cloud = false;
    this.wait_price_under_cloud = false;
}

// What happens on every new candle?
strat.update = function(candle) {
    
    var updateIchimokuValue = this.ichimoku.nextValue({
       high  : candle.high,
       low   : candle.low,
       close : candle.close
   });
    
    
    this.oldIchimokuValue = (this.ichimokuValue ? this.ichimokuValue : null);
    this.ichimokuValue = {
        tenkan: (updateIchimokuValue ? updateIchimokuValue.conversion : 0),
        kijun: (updateIchimokuValue ? updateIchimokuValue.base : 0),
        spanA: (updateIchimokuValue ? updateIchimokuValue.spanA : 0),
        spanB: (updateIchimokuValue ? updateIchimokuValue.spanB : 0)
    }
    
}

strat.check = function() {

    // Check Kijun over Tenkan
    kijun_over_before_last = (this.oldIchimokuValue.tenkan >= this.oldIchimokuValue.kijun) ? false : true;
    kijun_over_last = (this.ichimokuValue.tenkan >= this.ichimokuValue.kijun) ? false : true;
    kijun_crossing_tenkan = (kijun_over_before_last == false && kijun_over_last == true) ? true : false;
    // Check Tenkan over Kijun
    tenkan_over_before_last = (this.oldIchimokuValue.kijun >= this.oldIchimokuValue.tenkan) ? false : true;
    tenkan_over_last = (this.ichimokuValue.kijun >= this.ichimokuValue.tenkan) ? false : true;
    tenkan_crossing_kijun = (tenkan_over_before_last == false && tenkan_over_last == true) ? true : false;

    var sell_signal = false;
    // SELL signal 1 : Kijun over Tenkan
    if((kijun_crossing_tenkan || this.wait_price_under_cloud)){
        if(this.candle.close < Math.max(this.ichimokuValue.spanA,this.ichimokuValue.spanB)){
        //if(this.candle.close < this.ichimokuValue.spanA && this.candle.close < this.ichimokuValue.spanB){
            sell_signal = true;
            this.wait_price_over_cloud = false;
            this.wait_price_under_cloud = false;
            log.debug("[INFO] SELL signal - " + this.wait_price_under_cloud);
        }
        else{
            log.debug("[INFO] Kijun over Tenkan BUT wait price under the cloud");
            this.wait_price_under_cloud = true;
        }
        
    }
    // Add here other SELL signals
    // SELL actions
    if(sell_signal){    
        this.advice('short');
    }
    // Find BUY signals
    var buy_signal = false;
    // BUY signals 1 : Tenkan over Kijun and price over Span
    //if((tenkan_crossing_kijun || this.wait_price_over_cloud)){
        //if(this.candle.close > Math.max(this.ichimokuValue.spanA,this.ichimokuValue.spanB)){
        if(this.candle.close > this.ichimokuValue.spanA || this.candle.close < this.ichimokuValue.spanB){
            buy_signal = true;
            this.wait_price_over_cloud = false;
            this.wait_price_under_cloud = false;
            log.debug("[INFO] BUY signal");
        //}
        /*
        else{
            log.debug("[INFO] Tenkan over Kijun BUT wait price over the cloud");
            this.wait_price_over_cloud = true;
        }
        */
    }
    // Add here other BUY signals

    // Buy only if price is > Senkou A && < Senkou B

    // BUY actions
    if(buy_signal){        
        this.advice('long');
    }
}

module.exports = strat;