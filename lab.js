/* The Lab: local-only hospitality decision tools. No inputs leave the browser. */
const LabMath = (() => {
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const money = value => Math.round((finite(value) + Number.EPSILON) * 100) / 100;

  function labor(data) {
    const sales = Math.max(0, finite(data.sales));
    const hours = Math.max(0, finite(data.hours));
    const cost = Math.max(0, finite(data.cost));
    const target = Math.max(1, finite(data.target, 45));
    const rate = hours ? cost / hours : 0;
    const periods = data.periods.map(period => {
      const periodSales = Math.max(0, finite(period.sales));
      const periodHours = Math.max(0, finite(period.hours));
      const needed = periodSales / target;
      return {
        name: period.name,
        sales: periodSales,
        hours: periodHours,
        needed,
        gap: periodHours - needed,
        productivity: periodHours ? periodSales / periodHours : 0,
        cost: periodHours * rate
      };
    });
    return {
      sales, hours, cost, rate, target, periods,
      laborPct: sales ? 100 * cost / sales : 0,
      productivity: hours ? sales / hours : 0,
      targetHours: sales / target,
      hoursGap: hours - sales / target,
      targetCost: sales / target * rate
    };
  }

  function food(data) {
    const price = Math.max(0, finite(data.price));
    const ingredientCost = Math.max(0, finite(data.cost));
    const target = Math.max(1, finite(data.target, 30));
    const dishes = data.menu.map(dish => {
      const recipeCost = dish.ingredients.reduce((sum, item) =>
        sum + Math.max(0, finite(item.qty)) * Math.max(0, finite(item.unitCost)) /
          Math.max(0.01, Math.min(100, finite(item.yieldPct, 100)) / 100), 0);
      const dishPrice = Math.max(0, finite(dish.price));
      const units = Math.max(0, finite(dish.units));
      const unitMargin = dishPrice - recipeCost;
      const simulatedPrice = dishPrice * (1 + finite(data.priceChange) / 100);
      const simulatedCost = recipeCost * (1 + finite(data.costChange) / 100);
      const simulatedUnits = units * (1 + finite(data.unitsChange) / 100);
      return {
        name: dish.name, price: dishPrice, units, recipeCost, unitMargin,
        costPct: dishPrice ? 100 * recipeCost / dishPrice : 0,
        contribution: unitMargin * units,
        simulatedContribution: (simulatedPrice - simulatedCost) * simulatedUnits
      };
    });
    const averageUnits = dishes.length ? dishes.reduce((sum, item) => sum + item.units, 0) / dishes.length : 0;
    const averageMargin = dishes.length ? dishes.reduce((sum, item) => sum + item.unitMargin, 0) / dishes.length : 0;
    dishes.forEach(dish => {
      dish.group = dish.units >= averageUnits
        ? (dish.unitMargin >= averageMargin ? 'star' : 'volume')
        : (dish.unitMargin >= averageMargin ? 'opportunity' : 'review');
    });
    return {
      price, ingredientCost, target, dishes,
      quickPct: price ? 100 * ingredientCost / price : 0,
      quickMargin: price - ingredientCost,
      targetPrice: ingredientCost / (target / 100),
      contribution: dishes.reduce((sum, item) => sum + item.contribution, 0),
      simulatedContribution: dishes.reduce((sum, item) => sum + item.simulatedContribution, 0),
      averageUnits, averageMargin
    };
  }

  function roi(data) {
    const initial = Math.max(0, finite(data.initial));
    const monthly = Math.max(0, finite(data.monthly));
    const savings = Math.max(0, finite(data.savings));
    const annualCost = initial + 12 * monthly;
    const annualBenefit = 12 * savings;
    const fullBenefit = Math.max(0, finite(data.laborBenefit)) +
      Math.max(0, finite(data.foodBenefit)) + Math.max(0, finite(data.salesMarginBenefit));
    const horizon = Math.max(1, Math.min(60, Math.round(finite(data.horizon, 24))));
    const ramp = Math.max(1, Math.min(24, Math.round(finite(data.ramp, 3))));
    const discount = Math.max(0, finite(data.discount)) / 100;
    const scenarios = [finite(data.lowFactor, 70), 100, finite(data.highFactor, 130)].map(factor => {
      let cumulative = -initial;
      let discounted = -initial;
      let totalBenefits = 0;
      let payback = initial === 0 ? 0 : null;
      const months = [];
      for (let month = 1; month <= horizon; month++) {
        const adoption = Math.min(1, month / ramp);
        const benefit = fullBenefit * adoption * factor / 100;
        const net = benefit - monthly;
        cumulative += net;
        discounted += net / Math.pow(1 + discount, month / 12);
        totalBenefits += benefit;
        if (payback === null && cumulative >= 0) payback = month;
        months.push({month, adoption, benefit, net, cumulative});
      }
      const totalCost = initial + horizon * monthly;
      return {
        factor, months, payback, npv: discounted, net: cumulative,
        roi: totalCost ? 100 * (totalBenefits - totalCost) / totalCost : null,
        totalBenefits, totalCost
      };
    });
    return {
      initial, monthly, savings, fullBenefit, horizon, ramp, discount, scenarios,
      firstYearNet: annualBenefit - annualCost,
      firstYearRoi: annualCost ? 100 * (annualBenefit - annualCost) / annualCost : null,
      simplePayback: savings > monthly ? initial / (savings - monthly) : null
    };
  }
  return {labor, food, roi, money};
})();

window.initLab = ({getLang, esc, euro}) => {
  const byId = id => document.getElementById(id);
  const t = (en, es) => getLang() === 'es' ? es : en;
  const number = (value, digits = 1) => new Intl.NumberFormat(getLang() === 'es' ? 'es-ES' : 'en-GB', {
    maximumFractionDigits: digits
  }).format(value);
  const percentage = value => Number.isFinite(value) ? number(value) + '%' : '—';
  const signed = value => (value >= 0 ? '+' : '') + euro(value);
  const clean = value => esc(String(value));
  const text = (en, es) => clean(t(en, es));
  const value = numberValue => String(Number.isFinite(Number(numberValue)) ? numberValue : 0);

  const defaults = {
    labor: {
      sales: 25000, cost: 7500, hours: 600, target: 45,
      periods: [
        {name: 'Breakfast', sales: 6000, hours: 170},
        {name: 'Lunch', sales: 11000, hours: 250},
        {name: 'Dinner', sales: 8000, hours: 180}
      ]
    },
    food: {
      price: 15, cost: 4.5, target: 30, priceChange: 0, costChange: 0, unitsChange: 0,
      menu: [
        {name: 'Pasta', price: 14, units: 420, ingredients: [
          {name: 'Pasta', qty: 0.13, unitCost: 4, yieldPct: 100},
          {name: 'Sauce', qty: 0.18, unitCost: 6, yieldPct: 95},
          {name: 'Cheese', qty: 0.03, unitCost: 13, yieldPct: 95}
        ]},
        {name: 'Burger', price: 16, units: 300, ingredients: [
          {name: 'Beef', qty: 0.18, unitCost: 14, yieldPct: 90},
          {name: 'Bread and sides', qty: 1, unitCost: 2.4, yieldPct: 100}
        ]},
        {name: 'Salad', price: 13, units: 170, ingredients: [
          {name: 'Vegetables', qty: 0.25, unitCost: 6, yieldPct: 85},
          {name: 'Cheese and dressing', qty: 1, unitCost: 1.2, yieldPct: 100}
        ]}
      ]
    },
    roi: {
      savings: 1200, monthly: 350, initial: 2000,
      laborBenefit: 700, foodBenefit: 300, salesMarginBenefit: 200,
      ramp: 3, horizon: 24, discount: 8, lowFactor: 70, highFactor: 130
    }
  };
  let state = structuredClone(defaults);
  let active = 'labor';
  let mode = 'quick';

  function field(group, key, en, es, step = 'any', min = 0, max = 100000000) {
    return '<label class="lab-field"><span>' + text(en, es) + '</span><input type="number" inputmode="decimal" data-group="' +
      group + '" data-key="' + key + '" min="' + min + '" max="' + max + '" step="' + step +
      '" value="' + value(state[group][key]) + '"></label>';
  }
  function kpi(en, es, figure, footEn = '', footEs = '') {
    return '<div class="lab-kpi"><span>' + text(en, es) + '</span><strong>' + clean(figure) +
      '</strong><small>' + text(footEn, footEs) + '</small></div>';
  }
  function note(en, es) {
    return '<p class="lab-note">' + text(en, es) + '</p>';
  }
  function table(headers, rows) {
    return '<div class="lab-table-wrap"><table class="lab-table"><thead><tr>' +
      headers.map(header => '<th scope="col">' + clean(header) + '</th>').join('') +
      '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  }

  function laborInputs() {
    const quick = '<div class="lab-field-grid">' +
      field('labor', 'sales', 'Net sales (€)', 'Ventas netas (€)') +
      field('labor', 'cost', 'Full labor cost (€)', 'Coste laboral completo (€)') +
      field('labor', 'hours', 'Hours worked', 'Horas trabajadas') + '</div>';
    if (mode === 'quick') return quick;
    const periods = state.labor.periods.map((period, i) =>
      '<tr><th scope="row">' + text(
        ['Breakfast', 'Lunch', 'Dinner'][i], ['Desayuno', 'Comida', 'Cena'][i]) +
      '</th><td><input type="number" min="0" step="any" data-period="' + i +
      '" data-period-key="sales" value="' + value(period.sales) +
      '" aria-label="' + text('Sales', 'Ventas') + ' ' + (i + 1) +
      '"></td><td><input type="number" min="0" step="any" data-period="' + i +
      '" data-period-key="hours" value="' + value(period.hours) +
      '" aria-label="' + text('Hours', 'Horas') + ' ' + (i + 1) + '"></td></tr>'
    );
    return note('Plan one comparable period. The example rows add up to the totals above.',
      'Planifica un mismo periodo. Las franjas del ejemplo suman los totales de arriba.') +
      quick + '<div class="lab-field-grid">' +
      field('labor', 'target', 'Target sales per hour (€)', 'Objetivo de ventas por hora (€)', 'any', 1) +
      '</div><h4>' + text('Staffing by daypart', 'Cobertura por franja') + '</h4>' +
      table([t('Daypart', 'Franja'), t('Forecast sales (€)', 'Ventas previstas (€)'),
        t('Planned hours', 'Horas planificadas')], periods);
  }

  function ingredientRows(dish, dishIndex) {
    return dish.ingredients.map((item, ingredientIndex) =>
      '<div class="lab-ingredient-row"><label><span>' + text('Ingredient', 'Ingrediente') +
      '</span><input type="text" maxlength="40" data-dish="' + dishIndex +
      '" data-ingredient="' + ingredientIndex + '" data-ingredient-key="name" value="' +
      clean(item.name) + '"></label><label><span>' + text('Qty', 'Cant.') +
      '</span><input type="number" min="0" step="any" data-dish="' + dishIndex +
      '" data-ingredient="' + ingredientIndex + '" data-ingredient-key="qty" value="' +
      value(item.qty) + '"></label><label><span>' + text('€/unit', '€/unidad') +
      '</span><input type="number" min="0" step="any" data-dish="' + dishIndex +
      '" data-ingredient="' + ingredientIndex + '" data-ingredient-key="unitCost" value="' +
      value(item.unitCost) + '"></label><label><span>' + text('Yield %', 'Rend. %') +
      '</span><input type="number" min="1" max="100" step="any" data-dish="' + dishIndex +
      '" data-ingredient="' + ingredientIndex + '" data-ingredient-key="yieldPct" value="' +
      value(item.yieldPct) + '"></label><button type="button" class="lab-row-delete" data-action="remove-ingredient" data-dish="' +
      dishIndex + '" data-ingredient="' + ingredientIndex + '" aria-label="' +
      text('Remove ingredient', 'Quitar ingrediente') + '">×</button></div>'
    ).join('');
  }
  function foodInputs() {
    const quick = '<div class="lab-field-grid">' +
      field('food', 'price', 'Selling price excluding tax (€)', 'Precio de venta sin IVA (€)') +
      field('food', 'cost', 'Ingredient cost per portion (€)', 'Coste de ingredientes por ración (€)') +
      field('food', 'target', 'Target food cost (%)', 'Food cost objetivo (%)', 'any', 1, 100) +
      '</div>';
    if (mode === 'quick') return quick;
    const dishCards = state.food.menu.map((dish, i) =>
      '<div class="lab-dish"><div class="lab-dish-top"><h4>' + text('Dish', 'Plato') +
      ' ' + (i + 1) + '</h4><button type="button" class="lab-link" data-action="remove-dish" data-dish="' +
      i + '">' + text('Remove dish', 'Quitar plato') + '</button></div><div class="lab-field-grid">' +
      '<label class="lab-field"><span>' + text('Name', 'Nombre') +
      '</span><input type="text" maxlength="60" data-dish="' + i + '" data-dish-key="name" value="' +
      clean(dish.name) + '"></label><label class="lab-field"><span>' +
      text('Price excl. tax (€)', 'Precio sin IVA (€)') +
      '</span><input type="number" min="0" step="any" data-dish="' + i +
      '" data-dish-key="price" value="' + value(dish.price) +
      '"></label><label class="lab-field"><span>' + text('Units sold per month', 'Unidades vendidas al mes') +
      '</span><input type="number" min="0" step="any" data-dish="' + i +
      '" data-dish-key="units" value="' + value(dish.units) + '"></label></div>' +
      '<div class="lab-ingredients">' + ingredientRows(dish, i) + '</div>' +
      '<button type="button" class="lab-link" data-action="add-ingredient" data-dish="' + i +
      '">+ ' + text('Add ingredient', 'Añadir ingrediente') + '</button></div>'
    ).join('');
    return note('Recipe cost uses usable yield. The menu matrix compares only the dishes entered here.',
      'El escandallo considera el rendimiento útil. La matriz compara solo los platos introducidos aquí.') +
      dishCards + '<button type="button" class="lab-add" data-action="add-dish">+ ' +
      text('Add dish', 'Añadir plato') + '</button><h4>' +
      text('What-if scenario', 'Simulación de cambios') + '</h4><div class="lab-field-grid">' +
      field('food', 'priceChange', 'Price change (%)', 'Cambio de precio (%)', 'any', -100, 200) +
      field('food', 'costChange', 'Ingredient cost change (%)', 'Cambio de coste de ingredientes (%)', 'any', -100, 200) +
      field('food', 'unitsChange', 'Unit sales change (%)', 'Cambio de unidades vendidas (%)', 'any', -100, 200) +
      '</div>';
  }

  function roiInputs() {
    const quick = '<div class="lab-field-grid">' +
      field('roi', 'savings', 'Full monthly benefit (€)', 'Beneficio mensual a plena adopción (€)') +
      field('roi', 'monthly', 'Monthly recurring cost (€)', 'Coste mensual recurrente (€)') +
      field('roi', 'initial', 'One-time cost (€)', 'Coste inicial (€)') + '</div>';
    if (mode === 'quick') return quick;
    return note('Benefits below add up to the monthly figure above. Enter incremental margin, not gross sales.',
      'Los beneficios siguientes suman la cifra mensual anterior. Introduce margen incremental, no ventas brutas.') +
      quick + '<h4>' + text('Where the benefit comes from', 'Origen del beneficio') + '</h4>' +
      '<div class="lab-field-grid">' +
      field('roi', 'laborBenefit', 'Labor savings / month (€)', 'Ahorro laboral / mes (€)') +
      field('roi', 'foodBenefit', 'Food savings / month (€)', 'Ahorro en materia prima / mes (€)') +
      field('roi', 'salesMarginBenefit', 'Extra contribution / month (€)', 'Contribución adicional / mes (€)') +
      '</div><h4>' + text('Timing and uncertainty', 'Plazos e incertidumbre') + '</h4>' +
      '<div class="lab-field-grid">' +
      field('roi', 'ramp', 'Months to full adoption', 'Meses hasta plena adopción', '1', 1, 24) +
      field('roi', 'horizon', 'Analysis horizon (months)', 'Horizonte de análisis (meses)', '1', 1, 60) +
      field('roi', 'discount', 'Annual discount rate (%)', 'Tasa de descuento anual (%)', 'any', 0, 100) +
      field('roi', 'lowFactor', 'Conservative benefit (%)', 'Beneficio conservador (%)', 'any', 0, 100) +
      field('roi', 'highFactor', 'Optimistic benefit (%)', 'Beneficio optimista (%)', 'any', 100, 300) +
      '</div>';
  }

  function laborResults() {
    const result = LabMath.labor(state.labor);
    const metrics = '<div class="lab-kpis">' +
      kpi('Labor cost', 'Coste laboral', percentage(result.laborPct),
        'Full cost / net sales', 'Coste completo / ventas netas') +
      kpi('Sales per labor hour', 'Ventas por hora trabajada', euro(result.productivity)) +
      kpi('Loaded hourly cost', 'Coste por hora completo', euro(result.rate)) + '</div>';
    if (mode === 'quick') return metrics + note(
      'Read cost and productivity together. A lower labor percentage is not automatically better service.',
      'Interpreta coste y productividad juntos. Un porcentaje menor no garantiza mejor servicio.');
    const rows = result.periods.map(period => {
      const css = period.gap < -0.5 ? 'lab-negative' : period.gap > 0.5 ? 'lab-warm' : 'lab-positive';
      const index = result.periods.indexOf(period);
      return '<tr><th scope="row">' + text(['Breakfast', 'Lunch', 'Dinner'][index],
        ['Desayuno', 'Comida', 'Cena'][index]) + '</th><td>' + euro(period.sales) +
        '</td><td>' + number(period.hours) + '</td><td>' + number(period.needed) +
        '</td><td class="' + css + '">' + (period.gap >= 0 ? '+' : '') + number(period.gap) +
        '</td><td>' + euro(period.productivity) + '</td></tr>';
    });
    return metrics + '<div class="lab-kpis">' +
      kpi('Hours vs target', 'Horas frente al objetivo',
        (result.hoursGap >= 0 ? '+' : '') + number(result.hoursGap),
        'Planned minus estimated', 'Planificadas menos estimadas') +
      kpi('Cost at target hours', 'Coste con horas objetivo', euro(result.targetCost),
        'Same hourly cost assumed', 'Con el mismo coste por hora') + '</div>' +
      '<h4>' + text('Coverage view', 'Vista de cobertura') + '</h4>' +
      table([t('Daypart', 'Franja'), t('Sales', 'Ventas'), t('Hours', 'Horas'),
        t('Target hours', 'Horas objetivo'), t('Gap', 'Diferencia'),
        t('Sales / hour', 'Ventas / hora')], rows) +
      note('The target is your own planning assumption. Check roles, workload and service quality before changing shifts.',
        'El objetivo es una hipótesis de planificación propia. Revisa puestos, carga de trabajo y calidad de servicio antes de cambiar turnos.');
  }

  function foodResults() {
    const result = LabMath.food(state.food);
    const metrics = '<div class="lab-kpis">' +
      kpi('Food cost', 'Food cost', percentage(result.quickPct)) +
      kpi('Contribution / portion', 'Contribución por ración', euro(result.quickMargin)) +
      kpi('Price for target', 'Precio para objetivo', euro(result.targetPrice),
        'Before tax', 'Antes de IVA') + '</div>';
    if (mode === 'quick') return metrics + note(
      'The target price is a mathematical reference; demand, labor, waste and competition still matter.',
      'El precio objetivo es una referencia matemática; también importan demanda, trabajo, merma y competencia.');
    const names = {
      star: t('Star', 'Estrella'), volume: t('Volume driver', 'Tractor'),
      opportunity: t('Opportunity', 'Oportunidad'), review: t('Review', 'Revisar')
    };
    const rows = result.dishes.map(dish =>
      '<tr><th scope="row">' + clean(dish.name || t('Unnamed dish', 'Plato sin nombre')) +
      '</th><td>' + euro(dish.recipeCost) + '</td><td>' + percentage(dish.costPct) +
      '</td><td>' + euro(dish.unitMargin) + '</td><td>' + number(dish.units, 0) +
      '</td><td>' + euro(dish.contribution) + '</td><td><span class="lab-category">' +
      clean(names[dish.group]) + '</span></td></tr>'
    );
    const delta = result.simulatedContribution - result.contribution;
    return '<div class="lab-kpis">' +
      kpi('Current monthly contribution', 'Contribución mensual actual', euro(result.contribution)) +
      kpi('Simulated contribution', 'Contribución simulada', euro(result.simulatedContribution)) +
      kpi('Scenario difference', 'Diferencia del escenario', signed(delta)) + '</div>' +
      '<h4>' + text('Menu matrix', 'Matriz de la carta') + '</h4>' +
      table([t('Dish', 'Plato'), t('Recipe cost', 'Coste receta'), 'Food cost',
        t('Margin / unit', 'Margen / ud.'), t('Units', 'Unidades'),
        t('Monthly margin', 'Margen mensual'), t('Relative group', 'Grupo relativo')], rows) +
      note('Groups use the average units and unit contribution of this sample. They are not universal benchmarks.',
        'Los grupos usan la media de unidades y contribución de esta muestra. No son referencias universales.');
  }

  function roiResults() {
    const result = LabMath.roi(state.roi);
    const simple = result.simplePayback === null ? t('Not reached', 'No se alcanza')
      : number(result.simplePayback) + ' ' + t('months', 'meses');
    const metrics = '<div class="lab-kpis">' +
      kpi('First-year ROI', 'ROI del primer año', result.firstYearRoi === null ? '—' : percentage(result.firstYearRoi)) +
      kpi('First-year net benefit', 'Beneficio neto del primer año', euro(result.firstYearNet)) +
      kpi('Simple payback', 'Recuperación simple', simple,
        'At full benefit, no ramp', 'Con beneficio pleno, sin adopción gradual') + '</div>';
    if (mode === 'quick') return metrics + note(
      'Quick figures assume full benefit from month one. Use Advanced for adoption and risk scenarios.',
      'La vista rápida supone beneficio pleno desde el primer mes. Usa Avanzado para adopción y escenarios.');
    const central = result.scenarios[1];
    const advancedMetrics = '<div class="lab-kpis">' +
      kpi('Central-case ROI', 'ROI del escenario central',
        central.roi === null ? '—' : percentage(central.roi),
        number(result.horizon, 0) + ' months', number(result.horizon, 0) + ' meses') +
      kpi('Central-case NPV', 'VAN del escenario central', euro(central.npv)) +
      kpi('Central-case payback', 'Recuperación del escenario central',
        central.payback === null ? t('Not reached', 'No se alcanza') :
          number(central.payback, 0) + ' ' + t('months', 'meses')) + '</div>';
    const labels = [
      t('Conservative', 'Conservador'), t('Central', 'Central'), t('Optimistic', 'Optimista')
    ];
    const cards = result.scenarios.map((scenario, i) =>
      '<div class="lab-scenario"><span>' + clean(labels[i]) + ' · ' +
      percentage(scenario.factor) + '</span><strong>' +
      (scenario.roi === null ? '—' : percentage(scenario.roi)) +
      '</strong><small>ROI · ' + number(result.horizon, 0) + ' ' +
      t('months', 'meses') + '</small><div>' + text('Payback', 'Recuperación') +
      ': ' + (scenario.payback === null ? t('Not reached', 'No se alcanza') :
        number(scenario.payback, 0) + ' ' + t('months', 'meses')) +
      '</div><div>VAN / NPV: ' + euro(scenario.npv) + '</div></div>'
    ).join('');
    const points = [...new Set([1, 3, 6, 12, result.horizon].filter(month => month <= result.horizon))];
    const largest = Math.max(1, ...points.map(month => Math.abs(central.months[month - 1].cumulative)));
    const bars = points.map(month => {
      const amount = central.months[month - 1].cumulative;
      return '<div class="lab-cash-row"><span>' + number(month, 0) + ' ' +
        t('mo', 'mes') + '</span><div class="lab-cash-track"><span class="' +
        (amount < 0 ? 'negative' : 'positive') + '" style="width:' +
        Math.max(2, 100 * Math.abs(amount) / largest).toFixed(1) +
        '%"></span></div><strong>' + euro(amount) + '</strong></div>';
    }).join('');
    return advancedMetrics + '<h4>' + text('Adoption scenarios', 'Escenarios de adopción') +
      '</h4><div class="lab-scenarios">' + cards + '</div><h4>' +
      text('Cumulative cash flow · central case', 'Flujo acumulado · escenario central') +
      '</h4><div class="lab-cash">' + bars + '</div>' +
      note('Benefits ramp up gradually. NPV discounts monthly net cash flows; all figures are illustrative and depend on your assumptions.',
        'Los beneficios crecen gradualmente. El VAN descuenta los flujos netos mensuales; todas las cifras son ilustrativas y dependen de tus supuestos.');
  }

  function updateResults() {
    byId('labResults').innerHTML = active === 'labor' ? laborResults()
      : active === 'food' ? foodResults() : roiResults();
  }
  function render() {
    const titles = {
      labor: t('Labor Cost & Productivity', 'Coste laboral y productividad'),
      food: t('Food Cost & Menu Engineering', 'Food cost e ingeniería de menú'),
      roi: t('Hospitality ROI', 'ROI en hostelería')
    };
    byId('labHeading').textContent = titles[active];
    byId('labModeQuick').textContent = t('Quick', 'Rápido');
    byId('labModeAdvanced').textContent = t('Advanced', 'Avanzado');
    byId('labReset').textContent = t('Reset example', 'Restaurar ejemplo');
    byId('labExport').textContent = t('Download summary ↓', 'Descargar resumen ↓');
    document.querySelectorAll('#labTabs button').forEach(button => {
      const selected = button.dataset.lab === active;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
    });
    ['quick', 'advanced'].forEach(name => {
      const button = byId(name === 'quick' ? 'labModeQuick' : 'labModeAdvanced');
      button.classList.toggle('active', mode === name);
      button.setAttribute('aria-pressed', String(mode === name));
    });
    byId('labInputs').innerHTML = active === 'labor' ? laborInputs()
      : active === 'food' ? foodInputs() : roiInputs();
    updateResults();
  }
  window.renderLab = render;

  function clampInput(input) {
    const minimum = input.min === '' ? -1e9 : Number(input.min);
    const maximum = input.max === '' ? 1e9 : Number(input.max);
    const parsed = Number(input.value);
    return Math.min(maximum, Math.max(minimum, Number.isFinite(parsed) ? parsed : 0));
  }
  function scalePeriods(key, next, previous) {
    if (previous > 0) {
      state.labor.periods.forEach(period => { period[key] *= next / previous; });
    } else {
      state.labor.periods.forEach((period, i) => { period[key] = i === 0 ? next : 0; });
    }
  }
  function updateState(input) {
    if (input.dataset.period !== undefined) {
      state.labor.periods[Number(input.dataset.period)][input.dataset.periodKey] = clampInput(input);
      state.labor.sales = state.labor.periods.reduce((sum, period) => sum + period.sales, 0);
      state.labor.hours = state.labor.periods.reduce((sum, period) => sum + period.hours, 0);
      state.labor.cost = state.labor.hours * (state.labor.rate || 0);
    } else if (input.dataset.ingredient !== undefined) {
      const item = state.food.menu[Number(input.dataset.dish)].ingredients[Number(input.dataset.ingredient)];
      item[input.dataset.ingredientKey] = input.type === 'text' ? input.value : clampInput(input);
    } else if (input.dataset.dishKey) {
      state.food.menu[Number(input.dataset.dish)][input.dataset.dishKey] =
        input.type === 'text' ? input.value : clampInput(input);
    } else if (input.dataset.group) {
      const group = input.dataset.group;
      const key = input.dataset.key;
      const next = clampInput(input);
      const previous = state[group][key];
      state[group][key] = next;
      if (group === 'labor') {
        if (key === 'sales' || key === 'hours') scalePeriods(key, next, previous);
        if (key === 'cost' || key === 'hours') {
          state.labor.rate = state.labor.hours ? state.labor.cost / state.labor.hours : 0;
        }
      }
      if (group === 'roi') {
        const benefitKeys = ['laborBenefit', 'foodBenefit', 'salesMarginBenefit'];
        if (key === 'savings') {
          const total = benefitKeys.reduce((sum, name) => sum + state.roi[name], 0);
          if (total > 0) benefitKeys.forEach(name => { state.roi[name] *= next / total; });
          else state.roi.laborBenefit = next;
        } else if (benefitKeys.includes(key)) {
          state.roi.savings = benefitKeys.reduce((sum, name) => sum + state.roi[name], 0);
        }
      }
    }
    updateResults();
  }

  byId('labInputs').addEventListener('input', event => {
    if (event.target instanceof HTMLInputElement) updateState(event.target);
  });
  byId('labInputs').addEventListener('change', event => {
    if (event.target instanceof HTMLInputElement) {
      event.target.value = event.target.type === 'number'
        ? value(clampInput(event.target)) : event.target.value;
      updateState(event.target);
    }
  });
  byId('labInputs').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const dishIndex = Number(button.dataset.dish);
    if (action === 'add-dish') {
      state.food.menu.push({name: t('New dish', 'Nuevo plato'), price: 0, units: 0,
        ingredients: [{name: t('Ingredient', 'Ingrediente'), qty: 1, unitCost: 0, yieldPct: 100}]});
    } else if (action === 'remove-dish' && state.food.menu.length > 1) {
      state.food.menu.splice(dishIndex, 1);
    } else if (action === 'add-ingredient') {
      state.food.menu[dishIndex].ingredients.push({
        name: t('Ingredient', 'Ingrediente'), qty: 1, unitCost: 0, yieldPct: 100
      });
    } else if (action === 'remove-ingredient' && state.food.menu[dishIndex].ingredients.length > 1) {
      state.food.menu[dishIndex].ingredients.splice(Number(button.dataset.ingredient), 1);
    }
    render();
  });
  document.querySelectorAll('#labTabs button').forEach(button => {
    button.addEventListener('click', () => { active = button.dataset.lab; render(); });
  });
  byId('labModeQuick').addEventListener('click', () => { mode = 'quick'; render(); });
  byId('labModeAdvanced').addEventListener('click', () => { mode = 'advanced'; render(); });
  byId('labReset').addEventListener('click', () => {
    state[active] = structuredClone(defaults[active]);
    if (active === 'labor') state.labor.rate = state.labor.cost / state.labor.hours;
    render();
  });
  byId('labExport').addEventListener('click', () => {
    const title = byId('labHeading').textContent;
    const inputs = [...byId('labInputs').querySelectorAll('input')].map(input => {
      const label = input.closest('label');
      return (label?.querySelector('span')?.textContent || input.getAttribute('aria-label') || '') +
        ': ' + input.value;
    });
    const report = [title, new Date().toLocaleDateString(getLang() === 'es' ? 'es-ES' : 'en-GB'),
      '', t('Inputs', 'Datos'), ...inputs, '', t('Results', 'Resultados'),
      byId('labResults').innerText, '',
      t('Illustrative figures based on the assumptions entered.',
        'Cifras ilustrativas basadas en los supuestos introducidos.')].join('\n');
    const url = URL.createObjectURL(new Blob([report], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hosteleria-' + active + '-resumen.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  state.labor.rate = state.labor.cost / state.labor.hours;
  render();
};
