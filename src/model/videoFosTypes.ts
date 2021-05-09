//VideoFos OSC protocol:

// in 1 iteration everything with be Atem based timeline opjects. 
export const OSCProtocol = [
	'set/me -s {stringified TimelineObjAtemME}',
	'set/aux/{index}',
	'set/upstreamkeyer/{index} -s “{source}”',
	'set/downstreamkeyer/{index} -s “{source}”',
	'load/macro/{index} -s "{name}"',
	'start/macro/{index} -s "{name}"',
	'set/pips -s “Stringifed {Array of SuperSourceBoxes}”',
	'set/pips/props -s “Stringifed {Array of SuperSourceBoxesProps}”',
	'set/mediaplayer/{index} -s “{Stringified MediaPlayerState}"',
	'start/mediaplayer/{index}',
	'set/clip/{index} -s “{file}”',

	// Get state from VideoFos:
	'state/me/{index}', 
	'state/aux/{index}',
	'state/upstreamkeyer/{index}',
	'state/downstreamkeyer/{index}',
	'state/pips',
	'state/multiview/{index}',
	'state/mediaplayer/{index}',
	'state/clip/{index}',

	//Over time things like these may be an option:
	'set/me/prev/{index} -s “{source}”',
	'set/me/pgm/{index} -s “{source}”',
	'cut/me/{index}',

	// Special device specific commands could be done optional like this:
	'set/specialcommand -s "stringified {device specific command payload}"',

];

/* 
ATEM Commands atem-connection:

changeProgramInput(input: number, me = 0)
changePreviewInput(input: number, me = 0)
	public cut(me = 0): Promise<void> {
	public autoTransition(me = 0): Promise<void> {
	public fadeToBlack(me = 0): Promise<void> {
	public setFadeToBlackRate(rate: number, me = 0): Promise<void> {
	public autoDownstreamKey(key = 0, isTowardsOnAir?: boolean): Promise<void> {
	public setDipTransitionSettings(newProps: Partial<DipTransitionSettings>, me = 0): Promise<void> {
	public setDVETransitionSettings(newProps: Partial<DVETransitionSettings>, me = 0): Promise<void> {
	public setMixTransitionSettings(newProps: Pick<MixTransitionSettings, 'rate'>, me = 0): Promise<void> {
	public setTransitionPosition(position: number, me = 0): Promise<void> {
	public previewTransition(on: boolean, me = 0): Promise<void> {
	public setTransitionStyle(newProps: Partial<OmitReadonly<TransitionProperties>>, me = 0): Promise<void> {
	public setStingerTransitionSettings(newProps: Partial<StingerTransitionSettings>, me = 0): Promise<void> {
	public setWipeTransitionSettings(newProps: Partial<WipeTransitionSettings>, me = 0): Promise<void> {
	public setAuxSource(source: number, bus = 0): Promise<void> {
	public setDownstreamKeyTie(tie: boolean, key = 0): Promise<void> {
	public setDownstreamKeyOnAir(onAir: boolean, key = 0): Promise<void> {
	public setDownstreamKeyCutSource(input: number, key = 0): Promise<void> {
	public setDownstreamKeyFillSource(input: number, key = 0): Promise<void> {
	public setDownstreamKeyGeneralProperties(props: Partial<DownstreamKeyerGeneral>, key = 0): Promise<void> {
	public setDownstreamKeyMaskSettings(props: Partial<DownstreamKeyerMask>, key = 0): Promise<void> {
	public setDownstreamKeyRate(rate: number, key = 0): Promise<void> {
	public setTime(hour: number, minute: number, second: number, frame: number): Promise<void> {
	public requestTime(): Promise<void> {
	public macroContinue(): Promise<void> {
	public macroDelete(index = 0): Promise<void> {
	public macroInsertUserWait(): Promise<void> {
	public macroInsertTimedWait(frames: number): Promise<void> {
	public macroRun(index = 0): Promise<void> {
	public macroStop(): Promise<void> {
	public macroStartRecord(index: number, name: string, description: string): Promise<void> {
	public macroStopRecord(): Promise<void> {
	public macroUpdateProperties(props: Commands.MacroPropertiesCommand['properties'], index = 0): Promise<void> {
	public macroSetLoop(loop: boolean): Promise<void> {
	public setMultiViewerSource(newProps: OmitReadonly<MultiViewerSourceState>, mv = 0): Promise<void> {
	public setMediaPlayerSettings(newProps: Partial<MediaPlayer>, player = 0): Promise<void> {
	public setMediaPlayerSource(newProps: Partial<MediaPlayerSource>, player = 0): Promise<void> {
	public setMediaClip(index: number, name: string, frames = 1): Promise<void> {
	public clearMediaPoolClip(clipId: number): Promise<void> {
	public clearMediaPoolStill(stillId: number): Promise<void> {
	public setSuperSourceBoxSettings(
		newProps: Partial<SuperSource.SuperSourceBox>,
		box = 0,
		ssrcId = 0
	): 
	public setSuperSourceProperties(newProps: Partial<SuperSource.SuperSourceProperties>, ssrcId = 0): Promise<void> {
	public setSuperSourceBorder(newProps: Partial<SuperSource.SuperSourceBorder>, ssrcId = 0): Promise<void> {
	public setInputSettings(newProps: Partial<OmitReadonly<InputChannel>>, input = 0): Promise<void> {
		const command = new Commands.InputPropertiesCommand(input)
		command.updateProps(newProps)
		return this.sendCommand(command)
	}
	public setUpstreamKeyerChromaSettings(
		newProps: Partial<USK.UpstreamKeyerChromaSettings>,
		me = 0,
		keyer = 0
	)
	public setUpstreamKeyerCutSource(cutSource: number, me = 0, keyer = 0): Promise<void> {

	public setUpstreamKeyerFillSource(fillSource: number, me = 0, keyer = 0): Promise<void> {
	public setUpstreamKeyerDVESettings(
		newProps: Partial<USK.UpstreamKeyerDVESettings>,
		me = 0,
		keyer = 0
	public setUpstreamKeyerLumaSettings(
		newProps: Partial<USK.UpstreamKeyerLumaSettings>,
		me = 0,
		keyer = 0
	public setUpstreamKeyerMaskSettings(
		newProps: Partial<USK.UpstreamKeyerMaskSettings>,
		me = 0,
		keyer = 0
	public setUpstreamKeyerPatternSettings(
		newProps: Partial<USK.UpstreamKeyerPatternSettings>,
		me = 0,
		keyer = 0
	)
	public setUpstreamKeyerOnAir(onAir: boolean, me = 0, keyer = 0): Promise<void> {
	public runUpstreamKeyerFlyKeyTo(
		mixEffect: number,
		upstreamKeyerId: number,
		keyFrameId: Enums.FlyKeyKeyFrame.A | Enums.FlyKeyKeyFrame.B | Enums.FlyKeyKeyFrame.Full
	public runUpstreamKeyerFlyKeyToInfinite(
		mixEffect: number,
		upstreamKeyerId: number,
		direction: Enums.FlyKeyDirection
	public setUpstreamKeyerType(newProps: Partial<USK.UpstreamKeyerTypeSettings>, me = 0, keyer = 0): Promise<void> {
	public uploadStill(index: number, data: Buffer, name: string, description: string): Promise<DataTransfer> {
	public uploadClip(index: number, frames: Array<Buffer>, name: string): Promise<DataTransfer> {
	public uploadAudio(index: number, data: Buffer, name: string): Promise<DataTransfer> {
	public setAudioMixerInputMixOption(index: number, mixOption: Enums.AudioMixOption): Promise<void> {
	public setAudioMixerInputGain(index: number, gain: number): Promise<void> {
	public setAudioMixerInputBalance(index: number, balance: number): Promise<void> {
	public setAudioMixerInputProps(index: number, props: Partial<OmitReadonly<AudioChannel>>): Promise<void> {
	public setAudioMixerMasterGain(gain: number): Promise<void> {
	public setAudioMixerMasterProps(props: Partial<AudioMasterChannel>): Promise<void> {
	public startStreaming(): Promise<void> {
	public stopStreaming(): Promise<void> {
	public requestStreamingDuration(): Promise<void> {
	public setStreamingService(props: Partial<StreamingServiceProperties>): Promise<void> {
	public startRecording(): Promise<void> {
	public stopRecording(): Promise<void> {
	public requestRecordingDuration(): Promise<void> {
	public switchRecordingDisk(): Promise<void> {
	public setRecordingSettings(props: Partial<RecordingStateProperties>): Promise<void> {
	public listVisibleInputs(mode: 'program' | 'preview', me = 0): number[] {

		*/
