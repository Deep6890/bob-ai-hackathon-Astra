import AircraftAsset from './AircraftAsset'
import MissionReadiness from './MissionReadiness'
import FleetOverview from './FleetOverview'
import AssetHealth from './AssetHealth'
import FailureRisk from './FailureRisk'
import CriticalAlerts from './CriticalAlerts'
import UpcomingMaintenance from './UpcomingMaintenance'
import AICopilot from './AICopilot'

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-min max-w-[1400px]">
        <div className="col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2">
          <AircraftAsset />
        </div>
        <div className="col-span-1">
          <MissionReadiness />
        </div>
        <div className="col-span-1">
          <FleetOverview />
        </div>
        <div className="col-span-1">
          <AssetHealth />
        </div>
        <div className="col-span-1">
          <AICopilot />
        </div>
        <div className="col-span-1 md:col-span-2">
          <FailureRisk />
        </div>
        <div className="col-span-1">
          <CriticalAlerts />
        </div>
        <div className="col-span-1">
          <UpcomingMaintenance />
        </div>
      </div>
  )
}