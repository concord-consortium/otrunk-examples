require 'jruby'
require 'erb'
include_class 'java.lang.System'
include_class 'org.concord.framework.otrunk.view.OTUserListService'
include_class 'org.concord.framework.otrunk.OTrunk'
include_class 'org.concord.datagraph.state.OTDataGraph'
include_class 'org.concord.datagraph.state.OTDataGraphable'
include_class 'org.concord.otrunk.script.ui.OTScriptVariable'
include_class 'org.concord.framework.otrunk.wrapper.OTString'

def getText
  @otrunk = $viewContext.getViewService(OTrunk.java_class);
  @debug = true
  if $action
    actionStr = $action.string
  else
    actionStr = "default_template"
  end
  eval(actionStr)
end

def default_template
  render $template
end

def page2
  render $template_page2
end

def render(templateBlob)
  erb = ERB.new Java::JavaLang::String.new(templateBlob.src).to_s
  erb.result(binding)   
end 

def embedObject(obj)
  "<object refid=\"#{ obj.otExternalId() }\"/>"
end

def otCreate(rconstant, &block)
  otObj = $otObjectService.createObject(rconstant.java_class)
  yield otObj
  otObj
end

def linkToObject(link_text, obj, viewEntry=nil)
  link = "<a href=\"#{ obj.otExternalId() }\" "
  link += "viewid=\"#{ viewEntry.otExternalId() }\" "  if viewEntry
  link += ">#{link_text}</a>"
end

def linkToObjectAction(link_text, obj, action)
  viewEntryCopy = $otObjectService.copyObject($viewEntry, 1)
  viewEntryCopy.variables.add(otCreate(OTScriptVariable){|scriptVar|
    scriptVar.name="action"
    scriptVar.reference = otCreate(OTString){|str|
      str.string=action
    }
  })
  "<a href=\"#{ obj.otExternalId() }\" viewid=\"#{viewEntryCopy.otExternalId()}\">#{link_text}</a>"
end

def users
  userListService = $viewContext.getViewService(OTUserListService.java_class)
  userListService.getUserList()
end

def embedUserObject(obj, user)
  "<object refid=\"#{ obj.otExternalId() }\" user=\"#{ user.getUserId().toExternalForm() }\"/>"
end

def hasUserModified(obj, user)
  @otrunk.hasUserModified(obj, user)
end

def userObject(obj, user)
  @otrunk.getUserRuntimeObject(obj, user);
end

def otCreate(rconstant, &block)
  otObj = $otObjectService.createObject(rconstant.java_class)
  yield otObj
  otObj
end

def findFirstChild(rconstant, startObject)
  # check if the startObject is one of theses
  # if not go through all of its children objects
  # perhaps we should just do this in java
end

def log(message)
  System.err.println(message)
end

def checkType?(obj, klass)
  return true if obj.instanceof? klass
  
  log "obj is a #{obj.java_class} instead of being a #{klass.java_class.name}"
  false
end

def rootObject
  @otrunk.root
end

# --------- udl report specific -------------------

def linkToUnitPage(link_text)
  firstObject = rootObject.object.reportTemplate
  firstView = rootObject.object.reportTemplateViewEntry
  linkToObject link_text, firstObject, firstView
end

def layeredContainer
  modeSwitcher = rootObject.object.reportTemplate.reference
  modeSwitcher.otObject
end

def activityTitle
  return layeredContainer.name
end

def activitySectionContainer
  layeredContainer.layers.get(0)
end

def activitySections
  activitySectionContainer.cards.vector
end

def visitedSections(user)
  userSectionContainer = userObject(activitySectionContainer, user)
  userSectionContainer.viewedCards.vector
end

# ----- summary specific --------------

# ---- section specific -------------
def sectionTitle
  return $model.name
end