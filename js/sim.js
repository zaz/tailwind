// const log = math.log
// const exp = math.exp
// const erf = math.erf

Chart.defaults.font.size = 20

// Estimates for stock market statistics:
const rf = .00  // risk-free rate of return: ~= 2% - 2% fees = 0%
const rp = .30  // risk premium
const r = rf+rp
const vol = .45  // volatility
// If returns are a lognormal e^X, calculate mu, sd of X:
const sd2 = math.log((vol/(1+r))**2+1)
const sd = math.log((vol/(1+r))**2+1)**.5
const mu = math.log(1+r) - sd2/2
const emu_1 = (1+r)*math.exp(-1*sd2/2)-1
console.assert(1+r == Math.exp(mu + sd2/2))
//console.assert(emu_1 == math.exp(mu)-1)
const ts = [...Array(20*12+1)].map((_,i) => i/12)  // times (x-axis values)

function formatPrice(p) {
	if(p<1e3) { return Number(p).toLocaleString() }
	if(p<1e6) { return Number(p/1000).toLocaleString() + "K" }
	return Number(p/1e6).toLocaleString() + "M"
}

function rnorm(n=0) {
	// Return n normally distributed random values
	if(n==0) {
		const u = 1 - Math.random()  // subtraction to flip [0, 1) to (0, 1]
		const v = 1 - Math.random()
		return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v )
	}
	rnorms = Array(n)
	for(i=0; i<n; i++) { rnorms[i] = rnorm(0) }
	return rnorms
}

function erfinv(x) {
	// Error function inverse. Maximum relative error = .00013
	const a  = 0.147
	const b = 2/(Math.PI * a) + Math.log(1-x**2)/2
	const sqrt1 = Math.sqrt( b**2 - Math.log(1-x**2)/a )
	const sqrt2 = Math.sqrt( sqrt1 - b )
	return sqrt2 * Math.sign(x)
}

const lnormc = (x, m=mu, s=sd2) =>
	// CDF(x) of lognormal(mean, standard deviation)
	1/2 + 1/2*math.erf( (math.log(x)-m)/2**.5/s )

// quintile function of lognormal
const lnormq = (p, m=mu, s=sd2) => math.exp(m + 2**.5*s*erfinv(2*p-1))

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

const monteCarlo = (c) => {
	periods = ts.length
	monthlyReturns = rnorm(periods).map(n => math.exp(mu/12+n*sd/12**.5))
	y = Array(81)
	y[0] = c/12
	for(t=1; t<periods; t++) {
		y[t] = y[t-1]*monthlyReturns[t-1] + c/12
	}
	return y
}

$( () => {

const updateChart = (c=12*500) => {
	let mcs = [...Array(20)].map(() => monteCarlo(c))
	console.log(mcs)
	console.log(y)
	let mattress = ts.map(t => c*t)
	// ERROR: does not converge to c/r*(math.exp(r*t)-1) when vol==0
	let means = ts.map(t => c/mu*(math.exp(mu*t+sd2*t/2)-1))
	//let means = ts.map(t => c/mu*((1+r)**t-1))  // equivalent to above

	// ruled out: too low:
	//let means2 = ts.map(t => c/emu_1*(math.exp((math.exp(mu)-1)/sd2/2)*t)-1)
	//let means2 = ts.map(t => c*(math.exp((math.exp(mu)-1)*t+sd2*t/2)-1))
	//let means2 = ts.map(t => c/mu*(math.exp(mu*t)-1))
	// ruled out: too high:
	//let means2 = ts.map(t => c/mu*(math.exp(r*t+vol*t/2)-1))
	//let means2 = ts.map(t => c/r*(math.exp((math.exp(mu+sd2/2)-1)*t)-1))

	let medians = ts.map(t => c/mu*(math.exp(mu*t)-1))
	chart.data.datasets = [
		{data: means, label: "mean?", borderWidth: 6},
		//{data: means2, label: "mean?", borderWidth: 6, borderColor: "red"},
		{data: medians, label: "median", borderColor: "lightblue", borderWidth: 6},
		{data: mattress, label: "Money under Mattress", borderColor: "lightgray", borderDash: [6, 6], borderWidth: 6},
	]
	chart.data.datasets[3] = {data: mcs[3], borderColor: "orange", label: "Monte Carlo", borderWidth: 1}
	for(i=0; i<mcs.length; i++) {
		chart.data.datasets[i+4] = {data: mcs[i], borderColor: "orange", borderWidth: 1}
	}
	chart.update()
	let mcsExtra = [...Array(10000)].map(() => monteCarlo(c)).map(mc => mc[mc.length - 1])
	console.log("mean", Number(means[means.length-1]/1000).toLocaleString() + "K")
	//console.log("mean2", Number(means2[means2.length-1]/1000).toLocaleString() + "K")
	console.log("MC mean", Number(math.mean(mcsExtra)/1000).toLocaleString() + "K")
	console.log("median", Number(medians[medians.length-1]/1000).toLocaleString() + "K")
	console.log("MC median", Number(math.median(mcsExtra)/1000).toLocaleString() + "K")
}

const ctx = document.getElementById("chart")
let chart = new Chart(ctx, {
	type: 'line',
	data: {
		labels: ts
	},
	options: {
		elements: { point: { radius: 0 } },
		plugins: {
			legend: {
				labels: { filter: (item, chart) => !(item.text == undefined), }
			}
		},
		scales: {
			xs: {
				ticks: { ticks: 1, maxTicksLimit: 21, maxRotation: 0 },
				title: { display: true, text: "Time (years)" }
			},
			y: {
				ticks: { min: 1001, maxTicksLimit: 11, callback: formatPrice },
				title: { display: true, text: "Value of Investment ($)" },
				type: "logarithmic"
			}
		}
	}
})
updateChart()

$("#contributions").change(function() {
	let c = 12*$("#contributions").val()
	updateChart(c)
})

})
