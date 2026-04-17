document.addEventListener('DOMContentLoaded', () => {
 
  const themeBtn = document.getElementById('theme-btn');
  const themeIcons = { 'auto': '💻', 'light': '🌞', 'dark': '🌜' };
  const themeCycle = ['auto', 'light', 'dark'];
  let currentTheme = localStorage.getItem('app-theme') || 'auto';

  function applyTheme(theme) {
    if (themeBtn) themeBtn.textContent = themeIcons[theme];
    if (theme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.body.removeAttribute('data-theme');
    } else {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
      } else {
        document.body.removeAttribute('data-theme');
      }
    }
  }

  applyTheme(currentTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      let nextIndex = (themeCycle.indexOf(currentTheme) + 1) % themeCycle.length;
      currentTheme = themeCycle[nextIndex];
      localStorage.setItem('app-theme', currentTheme);
      applyTheme(currentTheme);
    });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentTheme === 'auto') {
      applyTheme('auto');
    }
  });

  let scoringStandards = null;
  let lastCalculatedState = null;
  const itemsContainer = document.getElementById('inputs-container');
  const calcBtn = document.getElementById('calc-btn');
  const resultSection = document.getElementById('result-section');
  var gradBtn = document.getElementById('grad-btn');
  
 
  const TEST_ITEMS = {
    "height": { label: "身高", unit: "cm", placeholder: "例如: 175", type: "number", step: "0.1" },
    "weight": { label: "体重", unit: "kg", placeholder: "例如: 65", type: "number", step: "0.1" },
    "lungCapacity": { label: "肺活量", unit: "ml", placeholder: "例如: 4000", type: "number" },
    "run50m": { label: "50米跑", unit: "秒", placeholder: "例如: 7.2", type: "number", step: "0.1" },
    "sitAndReach": { label: "坐位体前屈", unit: "cm", placeholder: "例如: 15.5", type: "number", step: "0.1" },
    "longJump": { label: "立定跳远", unit: "cm", placeholder: "例如: 240", type: "number" },
    "pullUp": { label: "引体向上", unit: "次", placeholder: "例如：0", type: "number", gender: "male" },
    "sitUp": { label: "1分钟仰卧起坐", unit: "次", placeholder: "例如：0", type: "number", gender: "female" },
    "run1000m": { label: "1000米跑", unit: "分.秒", placeholder: "例如: 3.30", type: "number", step: "0.01", gender: "male" },
    "run800m": { label: "800米跑", unit: "分.秒", placeholder: "例如: 3.30", type: "number", step: "0.01", gender: "female" }
  };

 
  fetch('data/standards.json')
    .then(res => res.json())
    .then(data => {
      scoringStandards = data;
      renderInputs();
    })
    .catch(err => {
      console.error('Failed to load standards.json', err);
      itemsContainer.innerHTML = '<p style="color:red">无法加载评分标准文件 standards.json，请检查是否存在并将项目部署在服务器环境下（或本地使用 Live Server）。</p>';
    });

  function getGender() {
    const radio = document.querySelector('input[name="gender"]:checked');
    return radio ? radio.value : 'male';
  }

  function renderInputs() {
    const gender = getGender();
    itemsContainer.innerHTML = '';

    Object.keys(TEST_ITEMS).forEach(key => {
      const itemList = TEST_ITEMS[key];
     
      if (itemList.gender && itemList.gender !== gender) return;

      const div = document.createElement('div');
      div.className = 'form-group col';
      div.innerHTML = `
        <label for="item-${key}">${itemList.label} (${itemList.unit})</label>
        <input type="${itemList.type}" id="item-${key}" 
               placeholder="${itemList.placeholder}" 
               ${itemList.step ? `step="${itemList.step}"` : ''}>
      `;
      itemsContainer.appendChild(div);
    });
  }

  function renderPastYears() {
    const agegroupRadio = document.querySelector('input[name="agegroup"]:checked');
    const agegroupVal = agegroupRadio ? agegroupRadio.value : '大一';
    const pastContainer = document.getElementById('past-years-inputs');
    pastContainer.innerHTML = '';
    
   
    const yearsMapping = { '大一': 0, '大二': 1, '大三': 2, '大四': 3 };
    const currentIdx = yearsMapping[agegroupVal];
    const yearNames = ['大一', '大二', '大三'];
    
    for (let i = 0; i < currentIdx; i++) {
        const div = document.createElement('div');
        div.className = 'col';
        div.innerHTML = `
          <label for="past-year-${i+1}">${yearNames[i]}学年总分</label>
          <input type="number" id="past-year-${i+1}" step="0.1" placeholder="免测请留空">
        `;
        pastContainer.appendChild(div);
    }
    
    if (currentIdx === 0) {
        pastContainer.innerHTML = '<p class="desc" style="width:100%; padding:0 15px; margin:0;">无往年成绩项。将在预测中把本次体测得分视作大一至大四所有学年的预测总分。</p>';
    }
  }

 
  document.querySelectorAll('input[name="gender"]').forEach(el => {
    el.addEventListener('change', renderInputs);
  });
  
 
  document.querySelectorAll('input[name="agegroup"]').forEach(el => {
    el.addEventListener('change', renderPastYears);
  });

 
  setTimeout(renderPastYears, 50);

 
  calcBtn.addEventListener('click', () => {
    if (!scoringStandards) {
      alert("评分标准尚未加载完成！");
      return;
    }
    
    let totalScore = 0; 
    let parsedValues = {};
    let itemScores = {};

    const gender = getGender();
    const agegroupRadio = document.querySelector('input[name="agegroup"]:checked');
    const agegroupVal = agegroupRadio ? agegroupRadio.value : '大一';
   
    const agegroup = (agegroupVal === '大一' || agegroupVal === '大二') ? '大一大二' : '大三大四';

    const tData = scoringStandards.scoringTables[gender][agegroup];
    const wData = scoringStandards.weights;

   
    document.querySelectorAll('#inputs-container input').forEach(input => {
      const key = input.id.replace('item-', '');
      parsedValues[key] = input.value;
    });

   
    if (parsedValues.height && parsedValues.weight) {
      const h = parseFloat(parsedValues.height) / 100;
      const w = parseFloat(parsedValues.weight);
      if (h > 0 && w > 0) {
        parsedValues.BMI = (w / (h * h)).toFixed(1);
      }
    }

    const LOWER_IS_BETTER = ['run50m', 'run1000m', 'run800m'];

    function parseToTimeSeconds(valStr) {
      if (!valStr) return null;
      let m = 0, s = 0;
      if (valStr.includes("'")) {
       
        const parts = valStr.split("'");
        m = parseInt(parts[0]) || 0;
        s = parseInt(parts[1].replace('"', '')) || 0;
      } else {
       
        const v = parseFloat(valStr);
        m = Math.floor(v);
        s = Math.round((v - m) * 100);
      }
      return m * 60 + s;
    }

    function formatToChineseTime(valStr) {
      if (!valStr) return '';
      let str = String(valStr);
      if (str.includes("'")) {
        const parts = str.split("'");
        return parts[0] + '分' + (parts[1] ? parts[1].replace(/"/g, '').replace('”','').padStart(2, '0') : '00') + '秒';
      }
      const parts = str.split('.');
      return parts[0] + '分' + (parts[1] ? parts[1].padEnd(2, '0') : '00') + '秒';
    }

    function formatToChineseTime(valStr) {
      if (!valStr) return '';
      let str = String(valStr);
      if (str.includes("'")) {
        const parts = str.split("'");
        return parts[0] + '分' + (parts[1] ? parts[1].replace(/"/g, '').replace('”','').padStart(2, '0') : '00') + '秒';
      }
      const parts = str.split('.');
      return parts[0] + '分' + (parts[1] ? parts[1].padEnd(2, '0') : '00') + '秒';
    }

   
    Object.keys(wData).forEach(key => {
     
      if (TEST_ITEMS[key] && TEST_ITEMS[key].gender && TEST_ITEMS[key].gender !== gender) {
        return;
      }
      
     
      if (!parsedValues[key] || parsedValues[key] === '') {
        itemScores[key] = { value: '未测', score: 0, weight: wData[key] };
        return;
      }

      let userVal = parseFloat(parsedValues[key]);
      const table = tData[key];
      if (!table) return;

      let gotScore = 0;
      
     
      if (key === 'BMI') {
        const ranges = (table.scoring || []).concat(table.intermediate || []);
        for (let r of ranges) {
          const min = r.range ? r.range[0] : r.minValue;
          const max = r.range ? r.range[1] : r.maxValue;
          if (userVal >= min && userVal <= max) {
            gotScore = r.score === 0 ? 80 : r.score;
            break;
          }
        }
      } 
     
      else if (key === 'run1000m' || key === 'run800m') {
        let scds = parseToTimeSeconds(parsedValues[key]);
       
        const sorted = [...table.scoring].sort((a, b) => parseToTimeSeconds(a.value) - parseToTimeSeconds(b.value));
        const worstScore = sorted[sorted.length - 1].score;
        for (let s of sorted) {
          if (scds <= parseToTimeSeconds(s.value)) {
            gotScore = s.score;
            break;
          }
        }
        if (gotScore === 0 && scds > parseToTimeSeconds(sorted[sorted.length - 1].value)) {
           gotScore = 0;
        }
      } 
     
      else {
        const isLowerBetter = LOWER_IS_BETTER.includes(key);
       
        const sorted = [...table.scoring].sort((a, b) => b.score - a.score);
        for (let s of sorted) {
          if (isLowerBetter) {
            if (userVal <= s.value) { gotScore = s.score; break; }
          } else {
            if (userVal >= s.value) { gotScore = s.score; break; }
          }
        }
      }

     
      itemScores[key] = {
        value: parsedValues[key],
        score: gotScore,
        weight: wData[key]
      };
      
      totalScore += gotScore * (wData[key] / 100);
    });

    const hundredScore = totalScore.toFixed(1);
    const twentyScore = Math.round(totalScore / 5);

    document.getElementById('hundred-score').innerText = hundredScore;
    document.getElementById('twenty-score').innerText = twentyScore;
    
   
    const detailsContainer = document.getElementById('details-container');
    detailsContainer.innerHTML = '<h3>各项测试明细</h3><ul style="list-style:none; padding-top:10px;">' + 
      Object.keys(itemScores).map(k => {
        let label = TEST_ITEMS[k] ? TEST_ITEMS[k].label : k;
        let unitStr = TEST_ITEMS[k] && TEST_ITEMS[k].unit ? TEST_ITEMS[k].unit : '';
        if (k === 'BMI') {
           label = 'BMI (体重/身高²)';
           unitStr = 'kg/m²';
        }

        const record = itemScores[k];
        
        let valStr = record.value === '未测' ? '未测试' : record.value + ' ' + unitStr;
        if (record.value !== '未测' && unitStr === '分.秒') {
            const parts = record.value.toString().split('.');
            valStr = parts[0] + '分' + (parts[1] ? parts[1].padEnd(2, '0') : '00') + '秒';
        }

        const color = record.score < 60 ? 'var(--fail-text)' : 'var(--pass-text)';

        return `<li style="padding: 8px 0; border-bottom: 1px solid var(--details-border); display: flex; justify-content: space-between;">
                  <span><strong>${label}</strong> <span style="font-size:0.8em;color:var(--desc-color)">(${record.weight}%)</span></span>
                  <span>
                    <span style="color:var(--primary); margin-right: 15px;">${valStr}</span> 
                    <span style="font-weight:bold; color:${color};">【${record.score}】</span>
                  </span>
                </li>`;
      }).join('') + '</ul>';

    document.getElementById('result-placeholder').classList.add('hidden');
    document.getElementById('strategy-placeholder').classList.add('hidden');
    document.getElementById('result-content').classList.remove('hidden');
    document.getElementById('strategy-content-wrapper').classList.remove('hidden');
    
   
    lastCalculatedState = { totalScore, itemScores, gender, agegroup, tData, wData, parsedValues };
    document.getElementById('strategy-content').innerHTML = '';

   
    resultSection.scrollIntoView({ behavior: 'smooth' });
  });

 
  const planBtn = document.getElementById('plan-btn');
  planBtn.addEventListener('click', () => {
    if (!lastCalculatedState) {
      alert("请先在此页面填入对应成绩并点击【计算总体测成绩】！");
      return;
    }
    const targetScore = parseFloat(document.getElementById('target-score').value);
    if (isNaN(targetScore) || targetScore <= 0 || targetScore > 120) {
      alert("请输入有效的百分制目标总分（例如：80）");
      return;
    }

    const { totalScore, itemScores, gender, tData, parsedValues } = lastCalculatedState;
    const strategyBox = document.getElementById('strategy-content');
    const gap = targetScore - totalScore;

    if (gap <= 0) {
      strategyBox.innerHTML = '<div class="grad-pass" style="padding:15px; border-radius:6px; text-align:center;">您当前的总分已经达到或超过了目标分数，继续保持！</div>';
      return;
    }

    let untestedKeys = [];
    let testedKeys = [];
    Object.keys(itemScores).forEach(k => {
      if (itemScores[k].value === '未测') untestedKeys.push(k);
      else testedKeys.push(k);
    });

    let html = `<div style="background:var(--info-box-bg); border:1px solid var(--details-border); border-radius:6px; padding:15px; margin-bottom:15px;">
                  <p>当前成绩：<strong>${totalScore.toFixed(1)}</strong> 分</p>
                  <p>目标缺口：<strong style="color:var(--highlight-color);">${gap.toFixed(1)}</strong> 分</p>
                </div>`;

    if (untestedKeys.length > 0) {
     
      const remainingWeight = untestedKeys.reduce((sum, k) => sum + itemScores[k].weight, 0);
      let requiredAvgScore = remainingWeight > 0 ? (gap / (remainingWeight / 100)) : 999;
      
      html += `<p class="desc" style="margin-bottom:15px;">平均每个未测项目需要拿 <strong style="color:var(--primary);">${requiredAvgScore.toFixed(1)}</strong> 分才能达成总目标：</p>`;
      
      if (requiredAvgScore > 100) {
        html += `<div class="grad-fail" style="margin-bottom:15px;">⚠ 预警：最高只能达到 ${(totalScore + remainingWeight * 1).toFixed(1)} 分</div>`;
        requiredAvgScore = 100;
      }
      
      html += '<div class="grid-container">';
      untestedKeys.forEach(k => {
        let label = TEST_ITEMS[k] ? TEST_ITEMS[k].label : k;
        let suggestion = "N/A";
        let scoreToFind = Math.max(0, Math.min(100, requiredAvgScore));
        const table = tData[k];

        if (k === 'BMI') {
           suggestion = " 17.9~23.9 正常范围 【满分15分】";
        } else if (table && table.scoring) {
           const isLowerBetter = ['run50m', 'run1000m', 'run800m'].includes(k);
          
           let sortedDesc = [...table.scoring].sort((a,b) => a.score - b.score);
           let found = sortedDesc.find(s => s.score >= scoreToFind);
           if (!found) found = sortedDesc[sortedDesc.length - 1];

           let formattedVal = found.value;
           if (TEST_ITEMS[k] && TEST_ITEMS[k].unit === '分.秒') {
               let strVal = String(formattedVal).replace(/"/g, '').replace(/”/g, '').replace(/''/g, '');
               let parts = strVal.includes("'") ? strVal.split("'") : strVal.split('.');
               formattedVal = parts[0] + '分' + (parts[1] ? parts[1].padEnd(2, '0') : '00') + '秒';
           } else if (TEST_ITEMS[k] && TEST_ITEMS[k].unit) {
               formattedVal += TEST_ITEMS[k].unit;
           }

           suggestion = `至少 ${formattedVal}【计${found.score}分】`;
        }
        
        html += `<div style="background:var(--gray-highlight); border-left:4px solid var(--primary); padding:10px 15px; border-radius:4px; margin-bottom:10px;">
                   <div style="font-weight:bold; margin-bottom:5px;">【${label}】</div>
                   <div style="color:var(--text-color);">${suggestion}</div>
                 </div>`;
      });
      html += '</div>';

    } else {
     
      
      let improvements = [];
      testedKeys.forEach(k => {
         if (k === 'BMI') return;
         const table = tData[k];
         if (!table || !table.scoring) return;

         const currScore = itemScores[k].score;
         if (currScore >= 100) return;
         
         const isLowerBetter = ['run50m', 'run1000m', 'run800m'].includes(k);
         let sorted = [...table.scoring].sort((a,b) => a.score - b.score);
         
        
         let nextTier = sorted.find(s => s.score > currScore);
         if (!nextTier) return;
         
         const scoreGain = nextTier.score - currScore;
         const weightedGain = scoreGain * (itemScores[k].weight / 100);
         
         improvements.push({
           key: k,
           label: TEST_ITEMS[k] ? TEST_ITEMS[k].label : k,
           unit: TEST_ITEMS[k] && TEST_ITEMS[k].unit ? TEST_ITEMS[k].unit : '',
           currentVal: itemScores[k].value,
           targetVal: nextTier.value,
           scoreGain: scoreGain,
           weightedGain: weightedGain
         });
      });
      
     
      improvements.sort((a,b) => b.weightedGain - a.weightedGain);
      
      if (improvements.length === 0) {
        html += '<p>找不到更多的提分空间（各项成绩均已趋于极限）。</p>';
      } else {
        improvements.forEach((imp) => {
          let currStr = imp.currentVal;
          let targStr = imp.targetVal;
          if (imp.unit === '分.秒') {
             let cStrVal = String(currStr).replace(/"/g, '').replace(/”/g, '').replace(/''/g, '');
             let cParts = cStrVal.includes("'") ? cStrVal.split("'") : cStrVal.split('.');
             currStr = cParts[0] + '分' + (cParts[1] ? cParts[1].padEnd(2,'0') : '00') + '秒';
             
             let tStrVal = String(targStr).replace(/"/g, '').replace(/”/g, '').replace(/''/g, '');
             let tParts = tStrVal.includes("'") ? tStrVal.split("'") : tStrVal.split('.');
             targStr = tParts[0] + '分' + (tParts[1] ? tParts[1].padEnd(2,'0') : '00') + '秒';
          } else if (imp.unit) {
             currStr += imp.unit;
             targStr += imp.unit;
          }

          html += `
          <div style="background:var(--info-box-bg); padding:10px 15px; border-left: 4px solid var(--primary); border-radius:4px; margin-bottom:10px;">
            <div style="font-weight:bold; margin-bottom:5px;">【${imp.label}】</div>
            <div style="font-size:0.95rem; color:var(--text-color);">
              <span style="color:var(--highlight-color);">${currStr}</span> ➔ <span style="color:var(--pass-text);">${targStr}</span> <span style="color:var(--pass-text);">【+${imp.scoreGain}分】</span>
            </div>
          </div>
          `;
        });
      }
    }
    
    strategyBox.innerHTML = html;
  });
  function renderPastYears() {
    const agegroupInput = document.querySelector('input[name="agegroup"]:checked');
    if (!agegroupInput) return;
    const agegroup = agegroupInput.value;
    const pastYearsContainer = document.getElementById('past-years-inputs');
    pastYearsContainer.innerHTML = '';
    let yearsToRender = 0;
    if (agegroup === '大二') yearsToRender = 1;
    if (agegroup === '大三') yearsToRender = 2;
    if (agegroup === '大四') yearsToRender = 3;
    for (let i = 1; i <= yearsToRender; i++) {
       let yLabel = ['大一', '大二', '大三'][i-1];
       pastYearsContainer.innerHTML += `<div class="col" style="flex:1; min-width:80px;">
           <label>${yLabel}成绩</label>
           <input type="number" class="past-year-score" placeholder="如 75 (免测留空)" step="0.1">
         </div>`;
    }
  }
  document.querySelectorAll('input[name="agegroup"]').forEach(r => r.addEventListener('change', renderPastYears));
  renderPastYears();

  var gradBtn = document.getElementById('grad-btn');
  gradBtn.addEventListener('click', () => {
    if (!lastCalculatedState) {
      alert("请先在此页面填入对应成绩并点击【计算总体测成绩】！");
      return;
    }
    const inputs = document.querySelectorAll('.past-year-score');
    let pastScores = [];
    let hasInvalid = false;
    inputs.forEach(inp => {
       let val = inp.value.trim();
       if (val !== '') {
          let num = parseFloat(val);
          if (isNaN(num) || num < 0 || num > 100) hasInvalid = true;
          else pastScores.push(num);
       }
    });
    if (hasInvalid) {
      alert("往年成绩必须为空（代表免测，不计入权重）或0-100之间的数字。");
      return;
    }
    const { totalScore, agegroup } = lastCalculatedState;
    let avgOthers = 0;
    if (agegroup === '大四') {
       if (pastScores.length > 0) {
         avgOthers = pastScores.reduce((a,b)=>a+b,0) / pastScores.length;
       } else {
         avgOthers = totalScore;
       }
    } else {
       let totalOtherYears = 3;
       let totalOtherSum = pastScores.reduce((a,b)=>a+b,0);
       let yearsNeededToFill = Math.max(0, 3 - pastScores.length);
       totalOtherSum += totalScore * yearsNeededToFill;
       avgOthers = totalOtherSum / totalOtherYears;
    }
    const gradFormulaResult = (avgOthers * 0.5) + (totalScore * 0.5);
    const resBox = document.getElementById('grad-result');
    resBox.classList.remove('hidden');
    resBox.classList.remove('grad-pass', 'grad-fail');
    if (gradFormulaResult >= 50) {
      resBox.textContent = `✅ 预估毕业得分：${gradFormulaResult.toFixed(2)}。满足毕业要求！`;
      resBox.classList.add('grad-pass');
    } else {
      resBox.textContent = `❌ 预估毕业得分：${gradFormulaResult.toFixed(2)}。未达到 50 分毕业标准！`;
      resBox.classList.add('grad-fail');
    }
  });
});
