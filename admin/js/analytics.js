// js/analytics.js - Final Analytics Dashboard Module

window.App.analytics = {
    // State
    allEvents: [],
    overallAnalytics: null,
    
    // Load analytics tab
    loadAnalyticsTab: async function() {
        console.log('📊 Loading Analytics Dashboard...');
        await this.loadOverallInsights();
        await this.loadEventsList();
    },

    // Load overall insights (left panel with preview)
    loadOverallInsights: async function() {
        console.log('🔍 Loading overall insights...');
        
        try {
            const currentUser = window.App.state.currentUser;
            
            // Get all data from view
            const { data: analyticsData, error } = await window.App.supabase
                .from('event_user_analytics')
                .select('*')
                .eq('organizer_id', currentUser.id)
                .eq('event_status', 'completed');
            
            if (error) throw error;
            
            if (!analyticsData || analyticsData.length === 0) {
                this.renderEmptyInsights();
                return;
            }
            
            // Process unique users and analytics
            const analytics = this.processAnalyticsData(analyticsData);
            this.overallAnalytics = analytics; // Store for modal
            
            // Update key metrics
            document.getElementById('total-users').textContent = analytics.totalUsers;
            
            // Draw gender preview chart
            this.drawGenderPreview(analytics.genderSplit);
            
        } catch (error) {
            console.error('❌ Error loading insights:', error);
            this.renderEmptyInsights();
        }
    },

    // Load events list (right panel)
    loadEventsList: async function() {
        console.log('📋 Loading events list...');
        const eventsList = document.getElementById('analytics-events-list');
        if (!eventsList) return;
        
        eventsList.innerHTML = '<div class="analytics-loading"><div class="analytics-spinner"></div></div>';
        
        try {
            const currentUser = window.App.state.currentUser;
            
            const { data: events, error } = await window.App.supabase
                .from('events')
                .select('*')
                .eq('organizer_id', currentUser.id)
                .eq('status', 'completed')
                .order('start_time', { ascending: false });
            
            if (error) throw error;
            
            if (!events || events.length === 0) {
                eventsList.innerHTML = '<div class="loading">No completed events found.</div>';
                return;
            }
            
            // Get participant counts from view
            for (let event of events) {
                const { data: eventData } = await window.App.supabase
                    .from('event_user_analytics')
                    .select('user_id, matched')
                    .eq('event_id', event.id);
                
                const uniqueUsers = new Set(eventData?.map(d => d.user_id) || []);
                event.participantCount = uniqueUsers.size;
                event.matchedCount = eventData?.filter(d => d.matched).length || 0;
                event.matchRate = event.participantCount > 0 
                    ? Math.round((event.matchedCount / event.participantCount) * 100) 
                    : 0;
            }
            
            this.allEvents = events;
            this.renderEventsList(events);
            
        } catch (error) {
            console.error('❌ Error loading events:', error);
            eventsList.innerHTML = '<div class="loading">Error loading events.</div>';
        }
    },

    // Process analytics data
    processAnalyticsData: function(analyticsData) {
        const uniqueUsers = new Map();
        const eventMatchData = new Map();
        
        analyticsData.forEach(record => {
            if (!uniqueUsers.has(record.user_id)) {
                uniqueUsers.set(record.user_id, record);
            }
            
            if (!eventMatchData.has(record.event_id)) {
                eventMatchData.set(record.event_id, {
                    totalUsers: new Set(),
                    matchedUsers: 0
                });
            }
            const eventData = eventMatchData.get(record.event_id);
            eventData.totalUsers.add(record.user_id);
            if (record.matched) eventData.matchedUsers++;
        });
        
        // Calculate average match rate
        let totalMatchRate = 0;
        let eventCount = 0;
        eventMatchData.forEach(data => {
            const userCount = data.totalUsers.size;
            if (userCount > 0) {
                totalMatchRate += (data.matchedUsers / userCount) * 100;
                eventCount++;
            }
        });
        const avgMatchRate = eventCount > 0 ? Math.round(totalMatchRate / eventCount) : 0;
        
        // Process preferences
        const usersArray = Array.from(uniqueUsers.values());
        const preferences = this.processUserPreferences(usersArray);
        
        return {
            totalUsers: uniqueUsers.size,
            avgMatchRate: avgMatchRate,
            eventCount: eventCount,
            ...preferences
        };
    },

    // Process user preferences
    processUserPreferences: function(users) {
        const genderCount = { male: 0, female: 0, other: 0 };
        const drinkCount = {};
        const musicCount = {};
        const ageCount = {};
        const languageCount = {};
        
        users.forEach(user => {
            // Gender
            if (user.gender) {
                const gender = user.gender.toLowerCase();
                if (gender === 'm' || gender === 'male') genderCount.male++;
                else if (gender === 'f' || gender === 'female') genderCount.female++;
                else genderCount.other++;
            }
            
            // Other preferences
            if (user.preferred_drink) drinkCount[user.preferred_drink] = (drinkCount[user.preferred_drink] || 0) + 1;
            if (user.music_preference) musicCount[user.music_preference] = (musicCount[user.music_preference] || 0) + 1;
            if (user.age_group) ageCount[user.age_group] = (ageCount[user.age_group] || 0) + 1;
            
            // Languages
            if (user.language_preference) {
                let languages = [];
                try {
                    if (typeof user.language_preference === 'string' && 
                        (user.language_preference.startsWith('[') || user.language_preference.startsWith('{'))) {
                        languages = JSON.parse(user.language_preference);
                    } else if (Array.isArray(user.language_preference)) {
                        languages = user.language_preference;
                    } else if (typeof user.language_preference === 'string') {
                        languages = user.language_preference.split(',').map(l => l.trim());
                    }
                } catch (e) {
                    if (typeof user.language_preference === 'string') {
                        languages = user.language_preference.split(',').map(l => l.trim());
                    }
                }
                
                if (!Array.isArray(languages)) languages = [languages];
                
                languages.forEach(lang => {
                    if (lang && lang !== '') {
                        languageCount[lang] = (languageCount[lang] || 0) + 1;
                    }
                });
            }
        });
        
        const getTop = (obj, limit = 5) => {
            return Object.entries(obj)
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([name, count]) => ({ name, count }));
        };
        
        return {
            genderSplit: genderCount,
            ageGroups: getTop(ageCount),
            topDrinks: getTop(drinkCount),
            topMusic: getTop(musicCount),
            topLanguages: getTop(languageCount)
        };
    },

    // Draw gender preview chart
    drawGenderPreview: function(data) {
        const canvas = document.getElementById('gender-preview-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const outerRadius = 50;
        const innerRadius = 30;
        
        const total = data.male + data.female + data.other;
        if (total === 0) {
            this.renderEmptyGenderPreview();
            return;
        }
        
        const colors = {
            male: '#60A5FA',
            female: '#F472B6',
            other: '#A78BFA'
        };
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let currentAngle = -Math.PI / 2;
        
        // Draw segments
        ['male', 'female', 'other'].forEach(gender => {
            if (data[gender] > 0) {
                const sliceAngle = (data[gender] / total) * 2 * Math.PI;
                
                ctx.fillStyle = colors[gender];
                ctx.beginPath();
                ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
                ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
                ctx.closePath();
                ctx.fill();
                
                currentAngle += sliceAngle;
            }
        });
        
        // Update stats
        const statsDiv = document.getElementById('gender-stats');
        if (statsDiv) {
            statsDiv.innerHTML = ['male', 'female', 'other'].map(gender => {
                if (data[gender] > 0) {
                    const percentage = Math.round((data[gender] / total) * 100);
                    return `
                        <div class="gender-stat">
                            <div class="gender-stat-label">
                                <div class="gender-stat-dot" style="background: ${colors[gender]}"></div>
                                ${gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Other'}
                            </div>
                            <div class="gender-stat-value">${percentage}%</div>
                        </div>
                    `;
                }
                return '';
            }).join('');
        }
    },

    // Render empty states
    renderEmptyInsights: function() {
        document.getElementById('total-users').textContent = '0';
        this.renderEmptyGenderPreview();
    },

    renderEmptyGenderPreview: function() {
        const statsDiv = document.getElementById('gender-stats');
        if (statsDiv) {
            statsDiv.innerHTML = '<div class="loading">No data available</div>';
        }
    },

    // Render events list
    renderEventsList: function(events) {
        const eventsList = document.getElementById('analytics-events-list');
        
        eventsList.innerHTML = events.map(event => {
            const eventDate = new Date(event.start_time).toLocaleDateString();
            
            return `
                <div class="event-list-item" onclick="openEventAnalytics('${event.id}')" data-event-name="${event.name.toLowerCase()}">
                    <div class="event-list-header">
                        <div>
                            <div class="event-list-name">${event.name}</div>
                            <div class="event-list-venue">📍 ${event.venue_name}</div>
                            <div class="event-list-date">${eventDate}</div>
                        </div>
                        <span class="event-status-badge">COMPLETED</span>
                    </div>
                    <div class="event-list-stats">
                        <div class="event-stat-item">
                            <div class="event-stat-value">${event.participantCount}</div>
                            <div class="event-stat-label">Users</div>
                        </div>
                        <div class="event-stat-item">
                            <div class="event-stat-value">${event.matchedCount}</div>
                            <div class="event-stat-label">Matched</div>
                        </div>
                        <div class="event-stat-item">
                            <div class="event-stat-value">${event.matchRate}%</div>
                            <div class="event-stat-label">Match Rate</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Open analytics modal (unified for both overall and event)
    openAnalyticsModal: async function(eventId = null) {
        const modal = document.getElementById('analytics-modal');
        const modalTitle = document.getElementById('analytics-modal-title');
        const analyticsContent = document.getElementById('analytics-content');
        
        if (!modal || !analyticsContent) return;
        
        modal.classList.add('active');
        analyticsContent.innerHTML = '<div class="analytics-loading"><div class="analytics-spinner"></div></div>';
        
        try {
            let analytics, title, userCount, matchedCount, matchRate;
            
            if (eventId) {
                // Event-specific analytics
                const { data: eventData, error } = await window.App.supabase
                    .from('event_user_analytics')
                    .select('*')
                    .eq('event_id', eventId);
                
                if (error) throw error;
                
                if (!eventData || eventData.length === 0) {
                    analyticsContent.innerHTML = '<div class="loading">No data available for this event.</div>';
                    return;
                }
                
                title = eventData[0].event_name;
                const uniqueUsers = new Map();
                eventData.forEach(record => {
                    if (!uniqueUsers.has(record.user_id)) {
                        uniqueUsers.set(record.user_id, record);
                    }
                });
                
                const usersArray = Array.from(uniqueUsers.values());
                userCount = usersArray.length;
                matchedCount = usersArray.filter(u => u.matched).length;
                matchRate = userCount > 0 ? Math.round((matchedCount / userCount) * 100) : 0;
                
                analytics = this.processUserPreferences(usersArray);
            } else {
                // Overall analytics
                title = 'Your Total Event Analytics';
                analytics = this.overallAnalytics;
                userCount = analytics.totalUsers;
                matchRate = analytics.avgMatchRate;
                matchedCount = Math.round((userCount * matchRate) / 100);
            }
            
            modalTitle.textContent = title;
            
            // Render detailed analytics in modal
            analyticsContent.innerHTML = this.renderDetailedAnalytics(
                userCount, 
                matchedCount, 
                matchRate, 
                analytics
            );
            
            // Draw charts
            setTimeout(() => {
                this.drawModalGenderChart(analytics.genderSplit);
                this.renderModalBarCharts(analytics);
            }, 100);
            
        } catch (error) {
            console.error('Error loading analytics:', error);
            analyticsContent.innerHTML = '<div class="loading">Error loading data.</div>';
        }
    },

    // Render detailed analytics content for modal - UPDATED
    renderDetailedAnalytics: function(userCount, matchedCount, matchRate, analytics) {
        return `
            <div class="modal-analytics-grid">
                <div class="analytics-card">
                    <div class="analytics-number">${userCount}</div>
                    <div class="analytics-label">Total Users</div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-number">${matchedCount}</div>
                    <div class="analytics-label">Matched Users</div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-number">${matchRate}%</div>
                    <div class="analytics-label">Match Rate</div>
                </div>
            </div>
            
            <div class="modal-chart-grid">
                <!-- Gender Distribution -->
                <div class="modal-chart-card">
                    <h4 class="modal-chart-title">👥 Gender Distribution</h4>
                    <canvas id="modal-gender-chart" width="200" height="200"></canvas>
                    <div id="modal-gender-legend" class="chart-legend"></div>
                </div>
                
                <!-- Age Groups -->
                <div class="modal-chart-card">
                    <h4 class="modal-chart-title">📊 Age Groups</h4>
                    <div id="modal-age-chart"></div>
                </div>
            </div>
            
            <div class="modal-chart-grid bottom-row">
                <!-- Top Drinks -->
                <div class="modal-chart-card">
                    <h4 class="modal-chart-title">🍹 Top Drinks</h4>
                    <div id="modal-drinks-chart"></div>
                </div>
                
                <!-- Music Preferences -->
                <div class="modal-chart-card">
                    <h4 class="modal-chart-title">🎵 Music Preferences</h4>
                    <div id="modal-music-chart"></div>
                </div>
                
                <!-- Languages -->
                <div class="modal-chart-card">
                    <h4 class="modal-chart-title">🌍 Languages</h4>
                    <div id="modal-languages-chart"></div>
                </div>
            </div>
        `;
    },

    // Draw gender chart in modal
    drawModalGenderChart: function(data) {
        const canvas = document.getElementById('modal-gender-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const outerRadius = 65;
        const innerRadius = 35;
        
        const total = data.male + data.female + data.other;
        if (total === 0) return;
        
        const colors = {
            male: '#60A5FA',
            female: '#F472B6',
            other: '#A78BFA'
        };
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let currentAngle = -Math.PI / 2;
        
        ['male', 'female', 'other'].forEach(gender => {
            if (data[gender] > 0) {
                const sliceAngle = (data[gender] / total) * 2 * Math.PI;
                
                ctx.fillStyle = colors[gender];
                ctx.beginPath();
                ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
                ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
                ctx.closePath();
                ctx.fill();
                
                currentAngle += sliceAngle;
            }
        });

        // Legend
        const legendDiv = document.getElementById('modal-gender-legend');
        if (legendDiv) {
            legendDiv.innerHTML = ['male', 'female', 'other'].map(gender => {
                if (data[gender] > 0) {
                    const percentage = Math.round((data[gender] / total) * 100);
                    const label = gender.charAt(0).toUpperCase() + gender.slice(1);
                    return `
                        <div class="legend-item">
                            <div class="legend-color" style="background: ${colors[gender]}"></div>
                            <span>${label}: ${data[gender]} (${percentage}%)</span>
                        </div>
                    `;
                }
                return '';
            }).join('');
        }
    },

    // Render bar charts in modal
    renderModalBarCharts: function(analytics) {
        // Render each chart
        this.renderHorizontalBarChart('modal-age-chart', analytics.ageGroups);
        this.renderHorizontalBarChart('modal-drinks-chart', analytics.topDrinks);
        this.renderHorizontalBarChart('modal-music-chart', analytics.topMusic);
        this.renderHorizontalBarChart('modal-languages-chart', analytics.topLanguages);
    },

    // Render horizontal bar chart - UPDATED
    renderHorizontalBarChart: function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="loading">No data available</div>';
            return;
        }
        
        // Use simple table for bottom row items (drinks, music, languages)
        if (containerId.includes('drinks') || containerId.includes('music') || containerId.includes('languages')) {
            container.innerHTML = `
                <div class="simple-table">
                    ${data.slice(0, 4).map(item => `
                        <div class="simple-table-row">
                            <div class="simple-table-label" title="${item.name}">${item.name}</div>
                            <div class="simple-table-value">${item.count}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            // Keep bar charts for age groups
            const maxValue = Math.max(...data.map(d => d.count));
            container.innerHTML = `
                <div class="horizontal-bar-chart">
                    ${data.slice(0, 5).map(item => {
                        const width = (item.count / maxValue) * 100;
                        return `
                            <div class="h-bar-item">
                                <div class="h-bar-label" title="${item.name}">${item.name}</div>
                                <div class="h-bar-container">
                                    <div class="h-bar" style="width: ${width}%"></div>
                                </div>
                                <div class="h-bar-value">${item.count}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }
};

// Global functions
window.openEventAnalytics = function(eventId) {
    window.App.analytics.openAnalyticsModal(eventId);
};

window.openOverallAnalytics = function() {
    window.App.analytics.openAnalyticsModal(null);
};

window.filterEvents = function() {
    const searchValue = document.getElementById('event-search').value.toLowerCase();
    const eventItems = document.querySelectorAll('.event-list-item');
    
    eventItems.forEach(item => {
        const eventName = item.dataset.eventName;
        if (eventName.includes(searchValue)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
};

window.closeAnalyticsModal = function() {
    const modal = document.getElementById('analytics-modal');
    if (modal) {
        modal.classList.remove('active');
    }
};