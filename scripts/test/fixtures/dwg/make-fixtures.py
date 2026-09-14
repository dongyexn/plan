import ezdxf
from ezdxf import xref
# ---- ref file (XR-PLAN) ----
r=ezdxf.new('R2000'); msp=r.modelspace()
r.layers.add('R-WALL'); r.layers.add('R-OFF', color=3)
r.layers.get('R-OFF').off()
for i in range(6): msp.add_line((100+i*30,100),(100+i*30,180),dxfattribs={'layer':'R-WALL'})
msp.add_lwpolyline([(90,90),(300,90),(300,190),(90,190)],close=True,dxfattribs={'layer':'R-WALL'})
msp.add_line((0,0),(500,500),dxfattribs={'layer':'R-OFF'})   # must be hidden via host XR-PLAN|R-OFF? host copy decides
door=r.blocks.new('DOOR'); door.add_arc((0,0),9,0,90); door.add_line((0,0),(9,0))
msp.add_blockref('DOOR',(120,150))
ps=r.layout('Layout1'); ps.add_lwpolyline([(0,0),(400,0),(400,280),(0,280)],close=True)  # paper junk – must NOT come along
r.saveas('XR-PLAN.dxf')
# ---- host ----
d=ezdxf.new('R2000'); msp=d.modelspace()
for n,extra in [('A-WALL',{}),('A-HIDE',{}),('A-FRZ',{}),('A-FRAME',{}),('A-TEXT',{})]: d.layers.add(n,**extra)
d.layers.get('A-HIDE').off(); d.layers.get('A-FRZ').freeze()
dp=d.layers.get('Defpoints'); dp.dxf.plot=0
# frame block TITLE-A3
fb=d.blocks.new('TITLE-A3')
fb.add_lwpolyline([(0,0),(420,0),(420,297),(0,297)],close=True,dxfattribs={'layer':'A-FRAME'})
fb.add_lwpolyline([(10,10),(410,10),(410,287),(10,287)],close=True,dxfattribs={'layer':'A-FRAME'})
fb.add_line((250,10),(250,60)); fb.add_line((250,60),(410,60)); fb.add_line((250,35),(410,35)); fb.add_line((330,10),(330,60))
fb.add_text('DRAWING TITLE',dxfattribs={'height':5,'layer':'A-TEXT'}).set_placement((255,45))
for k,(ox,oy) in enumerate([(0,0),(500,0),(1000,0)]):
    msp.add_blockref('TITLE-A3',(ox,oy))
    # room plan inside
    msp.add_lwpolyline([(ox+30,oy+80),(ox+230,oy+80),(ox+230,oy+250),(ox+30,oy+250)],close=True,dxfattribs={'layer':'A-WALL'})
    for i in range(5): msp.add_line((ox+30+i*40,oy+80),(ox+30+i*40,oy+250),dxfattribs={'layer':'A-WALL'})
    msp.add_line((ox+30,oy+80),(ox+230,oy+250),dxfattribs={'layer':'A-HIDE'})
    msp.add_line((ox+30,oy+250),(ox+230,oy+80),dxfattribs={'layer':'A-FRZ'})
    msp.add_line((ox+20,oy+20),(ox+400,oy+20),dxfattribs={'layer':'Defpoints'})
    msp.add_text('SHEET %d'%(k+1),dxfattribs={'height':6}).set_placement((ox+255,oy+20))
# xref
xref.define(d,'XR-PLAN','../ref/XR-PLAN.dwg')
msp.add_blockref('XR-PLAN',(1500,0))
msp.add_blockref('XR-PLAN',(1500,400))
# a normal empty block (must NOT be reported as xref)
d.blocks.new('EMPTY'); msp.add_blockref('EMPTY',(5,5))
# layout with title + viewport
L=d.layout('Layout1')
L.add_lwpolyline([(0,0),(420,0),(420,297),(0,297)],close=True)
L.add_text('LAYOUT TITLE',dxfattribs={'height':8}).set_placement((300,20))
vp=L.add_viewport(center=(200,160),size=(360,240),view_center_point=(680,150),view_height=300)
d.saveas('host.dxf')
# ---- frames on layer, no blocks ----
f=ezdxf.new('R2000'); m=f.modelspace(); f.layers.add('도면틀'); f.layers.add('A-WALL')
for ox in (0,600):
    m.add_lwpolyline([(ox,0),(ox+420,0),(ox+420,297),(ox,297)],close=True,dxfattribs={'layer':'도면틀'})
    for i in range(8): m.add_line((ox+40+i*30,40),(ox+40+i*30,250),dxfattribs={'layer':'A-WALL'})
    # noise rects on wall layer, fairly large (would confuse geometry)
    m.add_lwpolyline([(ox+50,50),(ox+380,50),(ox+380,260),(ox+50,260)],close=True,dxfattribs={'layer':'A-WALL'})
    m.add_lwpolyline([(ox+60,60),(ox+370,60),(ox+370,240),(ox+60,240)],close=True,dxfattribs={'layer':'A-WALL'})
f.saveas('frames-layer.dxf')
print('written')
