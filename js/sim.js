// Estimates for stock market statistics:
const rf = .02 // risk-free rate of return
const rp = .08 // risk premium
const vol = .18 // volatility

const lnormc = (x, mu=1, sd=1) =>
	// CDF(x) of lognormal(mean, standard deviation)
	1/2 + 1/2*math.erf( (math.log(x)-mu)/2**.5/sd )

const stock = (mu, v, t=1) =>
	// takes the expected return (e.g. 1.1), volitility of a stock, and duration
	// returns a cumulative density fn: the lognormal approximation for the stock
	x => lnormc(x, (math.log(mu) - v**2/2)*t, v*t**.5)

const max99 = (mu, v, t=1) => {
	// find the maximum growth of investment (99.9% chance less than this)
	sl = stock(mu, v, t)
	for (let i of Array(9000).keys()) {
		if (i < 1) { continue }
		if (sl(i) > .95) {
			return i
		}
	}
}

$( () => {

const ctx = document.getElementById("chart")
let s = stock(1.1, .18)
let x = [...Array(31)].map((_,i) => i/10)
//let y = [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1, 1.1]
//let d = x.map(x => lnormc(x, .1, .18))
let d = x.map(s)
let chart = new Chart(ctx, {
	type: 'line',
	data: {
		labels: x,
		datasets: [ { data: d } ]
	},
	options: {
		legend: {
			display: false
		},
		scales: {
			xAxes: [{
				ticks: { fontSize: 20 },
				scaleLabel: { display: true, labelString: "x", fontSize: 20 }
			}],
			yAxes: [{
				ticks: { callback: v => v*100 + "%", fontSize: 20 },
				scaleLabel: { display: true, labelString: "Chance of having less than x", fontSize: 20 }
			}]
		}
	}
})

$("input[type='range']").change(function() {
	el = $(this)
	el.prev("output").text(el.val())

	let risk = $("#risk").val()
	let years = $("#years").val()

	let max = max99(1+rf+rp*risk, vol*risk, years)
	let m = 10
	if (max > 100) {
		m = .5
	} else if (max > 10) {
		m = 1
	}
	let x = [...Array(Math.round(max*m)+1)].map((_,i) => i/m)
	let s = stock(1.02 + .08*risk, .18*risk, years)
	chart.data.labels = x
	chart.data.datasets[0].data = x.map(s)
	chart.update()
})

})
