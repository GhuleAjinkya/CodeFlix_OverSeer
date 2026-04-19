import { getRepos, getKnowledgeGaps } from './api.js';

let currentRepo = null;

async function initAllocator() {
    const repoSelect = document.getElementById('repoSelect');
    const loadStatus = document.getElementById('loadStatus');
    const raGrid = document.getElementById('raGrid');

    try {
        const repos = await getRepos();
        if (!repos || repos.length === 0) {
            repoSelect.innerHTML = '<option value="">No repos found</option>';
            return;
        }

        repoSelect.innerHTML = '<option value="">-- Select Repository --</option>';
        repos.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.full_name;
            opt.textContent = r.full_name;
            repoSelect.appendChild(opt);
        });

        repoSelect.addEventListener('change', async (e) => {
            currentRepo = e.target.value;
            if (!currentRepo) {
                raGrid.innerHTML = '<div class="RA_loader">Select a repository to scan for knowledge gaps...</div>';
                document.getElementById('raStats').innerHTML = `
                    <div class="RA_stat"><span class="RA_slbl">Total Silos</span><span class="RA_sval">-</span></div>
                    <div class="RA_stat"><span class="RA_slbl">Critical Risk</span><span class="RA_sval">-</span></div>
                `;
                return;
            }

            loadStatus.textContent = "Scanning repository history...";
            raGrid.innerHTML = '<div class="RA_loader">Scanning commits and analyzing file ownership...</div>';
            
            try {
                const data = await getKnowledgeGaps(currentRepo);
                renderAllocator(data);
                loadStatus.textContent = "Analysis complete.";
                setTimeout(() => loadStatus.textContent = "", 3000);
            } catch(err) {
                console.error(err);
                loadStatus.textContent = "";
                raGrid.innerHTML = `<div class="RA_loader" style="color: #ee4466">Failed to load knowledge gaps: ${err.message}</div>`;
            }
        });

    } catch(err) {
        console.error(err);
        repoSelect.innerHTML = '<option value="">Error loading repos</option>';
    }
}

function renderAllocator(data) {
    const raGrid = document.getElementById('raGrid');
    raGrid.innerHTML = '';

    // Update Stats
    document.getElementById('raStats').innerHTML = `
        <div class="RA_stat"><span class="RA_slbl">Total Silos</span><span class="RA_sval">${data.total_gaps}</span></div>
        <div class="RA_stat"><span class="RA_slbl">Critical Risk</span><span class="RA_sval" style="color: ${data.high_risk_gaps > 0 ? '#ee4466' : 'var(--D-fg)'}">${data.high_risk_gaps}</span></div>
    `;

    if (!data.knowledge_gaps || data.knowledge_gaps.length === 0) {
        raGrid.innerHTML = '<div class="RA_loader">No knowledge silos detected!</div>';
        return;
    }

    data.knowledge_gaps.forEach(gap => {
        const card = document.createElement('div');
        card.className = 'RA_card';
        
        let bdgClass = 'D_bdgg';
        let bdgText = 'Low Risk';
        if (gap.risk_level === 'high') { bdgClass = 'D_bdgr'; bdgText = 'High Risk'; }
        else if (gap.risk_level === 'medium') { bdgClass = 'D_bdgw'; bdgText = 'Medium Risk'; }

        // Developers HTML
        let devsHtml = '';
        if (gap.recommended_developers && gap.recommended_developers.length > 0) {
            gap.recommended_developers.forEach(dev => {
                let buls = dev.reasons.map(r => `<p class="RA_bul">• ${r}</p>`).join('');
                devsHtml += `
                    <div class="RA_dev">
                        <div class="RA_dtop">
                            <span class="RA_dname">@${dev.username}</span>
                            <span class="RA_dscore">${dev.score}% Match</span>
                        </div>
                        <div class="RA_barbg"><div class="RA_barfg" style="width: ${dev.score}%"></div></div>
                        ${buls}
                        <button class="RA_btn">Assign to Cross-Train</button>
                    </div>
                `;
            });
        } else {
            devsHtml = '<div class="RA_loader" style="padding: 20px;">No recommendations available</div>';
        }

        const initial = gap.sole_owner ? gap.sole_owner.substring(0,2).toUpperCase() : '??';

        card.innerHTML = `
            <div class="RA_chd">
                <div>
                    <div class="RA_fname">${gap.file}</div>
                    <div class="RA_fmod">Module: ${gap.module}</div>
                </div>
                <span class="D_bdg ${bdgClass}">${bdgText}</span>
            </div>
            
            <div class="RA_owner">
                <div class="RA_oav">${initial}</div>
                <span class="RA_oname">Sole Owner: @${gap.sole_owner}</span>
            </div>
            
            <div style="border-top: 1px dashed var(--D-border); margin: 8px 0;"></div>
            
            <div class="RA_reclbl">Recommended to Cross-Train</div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${devsHtml}
            </div>
        `;
        raGrid.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', initAllocator);
