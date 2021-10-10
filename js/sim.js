// const log = math.log
// const exp = math.exp
// const erf = math.erf

// Estimates for stock market statistics:
const rf = .00  // risk-free rate of return: ~= 2% - 2% fees = 0%
const rp = .30  // risk premium
const r = rf+rp
const vol = .45  // volatility
// If returns are a lognormal e^X, calculate mu, sd of X:
const sd = (math.log((vol/(1+r))**2+1))**.5
const mu = math.log(1+r) - .5*sd**2
const emu_1 = (1+r)*math.exp(-1*sd**2/2)-1
console.assert(1+r == Math.exp(mu + sd**2/2))
//console.assert(emu_1 == math.exp(mu)-1)
const ts = [...Array(81)].map((_,i) => i/4)  // times (x-axis values)

// math.js does not have an inverse error function
function erfinv(x) {
	// maximum relative error = .00013
	const a  = 0.147
	const b = 2/(Math.PI * a) + Math.log(1-x**2)/2
	const sqrt1 = Math.sqrt( b**2 - Math.log(1-x**2)/a )
	const sqrt2 = Math.sqrt( sqrt1 - b )
	return sqrt2 * Math.sign(x)
}

const lnormc = (x, m=mu, s=sd) =>
	// CDF(x) of lognormal(mean, standard deviation)
	1/2 + 1/2*math.erf( (math.log(x)-m)/2**.5/s )

// quintile function of lognormal
const lnormq = (p, m=mu, s=sd) => math.exp(m + 2**.5*s*erfinv(2*p-1))

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

const updateChart = (c=12*500) => {
	let means = ts.map(t => c/r*(math.exp(r*t)-1))
	// error: returns increase as volatility increases
	let means2 = ts.map(t => c/emu_1*(math.exp(emu_1*t)-1))
	//let means2 = ts.map(t => c/mu*((1+r)**t-1))
	//let means2 = ts.map(t => c/r*(math.exp((math.exp(mu+sd**2/2)-1)*t)-1))
	let medians = ts.map(t => c/mu*(math.exp(mu*t)-1))
	let medians2 = ts.map(t => c/mu*(math.exp(mu*t)-1))
	chart.data.datasets = [ {data:means, label: "mean"}, {data:medians, borderColor: "lightblue"}, {data:means2} ]
	//chart.data.datasets[0].data = ts.map(t => c/r*(math.exp(r*t)-1))
	chart.update()
}

const ctx = document.getElementById("chart")
let chart = new Chart(ctx, {
	type: 'line',
	data: {
		labels: ts
	},
	options: {
		legend: {
			display: false
		},
		scales: {
			xAxes: [{
				ticks: { ticks: 1, maxTicksLimit: 21, maxRotation: 0, fontSize: 20 },
				scaleLabel: { display: true, labelString: "Time (years)", fontSize: 20 }
			}],
			yAxes: [{
				ticks: { callback: v => Number(v/1000).toLocaleString() + "K", fontSize: 20 },
				scaleLabel: { display: true, labelString: "Expected Value of Investment ($)", fontSize: 20 }
			}]
		}
	}
})
updateChart()

$("#contributions").change(function() {
	let c = 12*$("#contributions").val()
	updateChart(c)
})

})
